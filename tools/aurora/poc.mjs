#!/usr/bin/env node
/**
 * Dev-toolkit PoC: sync → build → deploy → run (M0.5).
 * Кросс-платформенный оркестратор; конфиг — tools/aurora/local.env (см. local.env.example).
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

/** @type {Record<string, { source: string; rpmGlob: string; runScript: string; deployRpmName: string; stagingName: string }>} */
const PROJECTS = {
  "poc-bridge": {
    source: path.join(REPO_ROOT, "runtime", "poc-bridge"),
    rpmGlob: "ru.auroraos.poc-bridge-*.rpm",
    runScript: path.join(__dirname, "run-poc.sh"),
    deployRpmName: "poc-bridge.rpm",
    stagingName: "poc-bridge",
  },
  container: {
    source: path.join(REPO_ROOT, "runtime", "container"),
    rpmGlob: "ru.auroraos.aurobore-container-*.rpm",
    runScript: path.join(__dirname, "run-container.sh"),
    deployRpmName: "aurobore-container.rpm",
    stagingName: "aurobore-container",
  },
};

const COMMANDS = ["sync", "build", "deploy", "run", "emulator", "all"];

const project = resolveProject();
const projectCfg = PROJECTS[project];

/** @type {Record<string, string>} */
const cfg = loadConfig(projectCfg.stagingName);

function resolveProject() {
  const fromArgv = process.argv[3];
  const fromEnv = process.env.RUNTIME_PROJECT;
  const name = fromArgv || fromEnv || "poc-bridge";
  if (!PROJECTS[name]) {
    console.error(`[runtime] ERROR: неизвестный проект: ${name} (доступны: ${Object.keys(PROJECTS).join(", ")})`);
    process.exit(1);
  }
  return name;
}

function loadConfig(stagingName) {
  /** @type {Record<string, string>} */
  const env = {
    SFDK_TARGET: "AuroraOS-5.2.1.200-x86_64",
    EMULATOR_SSH_USER: "defaultuser",
    EMULATOR_SSH_HOST: "127.0.0.1",
    EMULATOR_SSH_PORT: "2223",
    EMULATOR_BOOT_TIMEOUT: "300",
    EMULATOR_WARMUP_SEC: "15",
    EMULATOR_SSH_CONNECT_TIMEOUT: "5",
    POC_RPM_GLOB: PROJECTS["poc-bridge"].rpmGlob,
  };

  const localEnv = path.join(__dirname, "local.env");
  if (fs.existsSync(localEnv)) {
    for (const line of fs.readFileSync(localEnv, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      val = expandPath(val);
      env[key] = val;
    }
  }

  if (!env.POC_BUILD_DIR) {
    env.POC_BUILD_DIR = path.join(os.homedir(), "aurobore-spike", stagingName);
  } else {
    env.POC_BUILD_DIR = expandPath(env.POC_BUILD_DIR);
  }

  if (!env.EMULATOR_SSH_KEY && process.platform === "win32") {
    const defaultKey = "C:\\AuroraOS\\vmshare\\ssh\\private_keys\\sdk";
    if (fs.existsSync(defaultKey)) env.EMULATOR_SSH_KEY = defaultKey;
  }
  if (!env.AURORA_SDK_BIN && process.platform === "win32") {
    const sdkBin = "C:\\AuroraOS\\bin";
    if (fs.existsSync(path.join(sdkBin, "sfdk.exe"))) env.AURORA_SDK_BIN = sdkBin;
  }

  env.PATH = process.env.PATH ?? "";
  env.SystemRoot = process.env.SystemRoot ?? "C:\\Windows";

  return env;
}

/** @param {string} s */
function expandPath(s) {
  if (process.platform === "win32") {
    return s
      .replace(/^%USERPROFILE%/i, os.homedir())
      .replace(/^~(?=\\|\/|$)/, os.homedir());
  }
  return s.replace(/^~(?=\\|\/|$)/, os.homedir());
}

function log(msg) {
  console.log(`[${project}] ${msg}`);
}

function fail(msg) {
  console.error(`[${project}] ERROR: ${msg}`);
  process.exit(1);
}

/** @returns {NodeJS.ProcessEnv} — чистая копия env с Aurora SDK в PATH (не мутировать process.env.PATH). */
function childEnv() {
  const sdkBin =
    cfg.AURORA_SDK_BIN ||
    (process.platform === "win32" ? "C:\\AuroraOS\\bin" : "");
  if (!sdkBin) return { ...process.env };
  return {
    ...process.env,
    PATH: `${sdkBin}${path.delimiter}${process.env.PATH ?? ""}`,
  };
}

function sfdkPath() {
  if (cfg.AURORA_SDK_BIN) {
    return path.join(cfg.AURORA_SDK_BIN, process.platform === "win32" ? "sfdk.exe" : "sfdk");
  }
  return process.platform === "win32" ? "sfdk.exe" : "sfdk";
}

/** @param {"ssh"|"scp"} tool */
function openSshTool(tool) {
  if (process.platform === "win32") {
    const candidate = path.join(
      cfg.SystemRoot ?? process.env.SystemRoot ?? "C:\\Windows",
      "System32",
      "OpenSSH",
      `${tool}.exe`,
    );
    if (fs.existsSync(candidate)) return candidate;
  }
  return tool;
}

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ cwd?: string; inherit?: boolean; allowCodes?: number[]; maxBuffer?: number }} [opts]
 */
function run(cmd, args, opts = {}) {
  log(`${path.basename(cmd)} ${args.join(" ")}`);
  const inherit = opts.inherit ?? false;
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd,
    env: childEnv(),
    shell: false,
    stdio: inherit ? "inherit" : "pipe",
    maxBuffer: opts.maxBuffer ?? 10 * 1024 * 1024,
    ...(inherit ? {} : { encoding: "utf8" }),
  });
  if (!inherit) {
    if (res.stdout) process.stdout.write(res.stdout);
    if (res.stderr) process.stderr.write(res.stderr);
  }
  const ok =
    res.status === 0 || (opts.allowCodes != null && opts.allowCodes.includes(res.status ?? -1));
  if (!ok) {
    fail(`команда завершилась с кодом ${res.status}: ${path.basename(cmd)} ${args.join(" ")}`);
  }
  return res;
}

function pathsEqual(a, b) {
  try {
    return fs.realpathSync.native(a) === fs.realpathSync.native(b);
  } catch {
    return path.resolve(a) === path.resolve(b);
  }
}

function cmdSync() {
  const src = projectCfg.source;
  const dst = cfg.POC_BUILD_DIR;

  if (pathsEqual(src, dst)) {
    log(`sync: пропуск — источник и POC_BUILD_DIR совпадают (${dst})`);
    return;
  }

  fs.mkdirSync(dst, { recursive: true });

  if (process.platform === "win32") {
    const robocopy = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "robocopy.exe");
    // /E — обновить дерево источников; не /MIR, чтобы не сносить CMake/RPMS в staging
    run(robocopy, [src, dst, "/E", "/XD", "RPMS", "CMakeFiles", ".sfdk", "/NFL", "/NDL", "/NJH", "/NJS"], {
      allowCodes: [0, 1, 2, 3, 4, 5, 6, 7],
    });
  } else {
    run("rsync", ["-a", "--delete", "--exclude", "RPMS/", `${src}/`, `${dst}/`]);
  }
  log(`sync: ${src} → ${dst}`);
}

function cmdBuild() {
  cmdSync();
  const cwd = cfg.POC_BUILD_DIR;
  cfg.POC_RPM_GLOB = projectCfg.rpmGlob;
  const sfdkArgs = ["-c", `target=${cfg.SFDK_TARGET}`, "build"];
  log(`build: target=${cfg.SFDK_TARGET} cwd=${cwd}`);
  run(sfdkPath(), sfdkArgs, { cwd, maxBuffer: 20 * 1024 * 1024 });

  const rpmsDir = path.join(cwd, "RPMS");
  const glob = cfg.POC_RPM_GLOB.replace(/\*/g, ".*");
  const re = new RegExp(`^${glob}$`);
  const rpms = fs.existsSync(rpmsDir)
    ? fs.readdirSync(rpmsDir).filter((f) => re.test(f))
    : [];
  if (rpms.length === 0) {
    fail(`RPM не найден в ${rpmsDir} (шаблон ${cfg.POC_RPM_GLOB})`);
  }
  log(`build: ${path.join(rpmsDir, rpms[0])}`);
}

function findRpm() {
  const rpmsDir = path.join(cfg.POC_BUILD_DIR, "RPMS");
  const glob = projectCfg.rpmGlob.replace(/\*/g, ".*");
  const re = new RegExp(`^${glob}$`);
  const rpms = fs.existsSync(rpmsDir)
    ? fs.readdirSync(rpmsDir).filter((f) => re.test(f))
    : [];
  if (rpms.length === 0) fail(`RPM не найден: ${rpmsDir}/${projectCfg.rpmGlob}`);
  return path.join(rpmsDir, rpms[0]);
}

function sshArgs(remoteCmd) {
  const key = cfg.EMULATOR_SSH_KEY;
  const port = cfg.EMULATOR_SSH_PORT;
  const user = cfg.EMULATOR_SSH_USER;
  const host = cfg.EMULATOR_SSH_HOST;
  const args = [
    "-i",
    key,
    "-o",
    "StrictHostKeyChecking=no",
    "-o",
    "UserKnownHostsFile=NUL",
    "-o",
    `ConnectTimeout=${cfg.EMULATOR_SSH_CONNECT_TIMEOUT}`,
    "-p",
    port,
    `${user}@${host}`,
  ];
  if (remoteCmd) args.push(remoteCmd);
  return args;
}

function scpArgs(local, remote) {
  const key = cfg.EMULATOR_SSH_KEY;
  const port = cfg.EMULATOR_SSH_PORT;
  const user = cfg.EMULATOR_SSH_USER;
  const host = cfg.EMULATOR_SSH_HOST;
  return [
    "-i",
    key,
    "-o",
    "StrictHostKeyChecking=no",
    "-P",
    port,
    local,
    `${user}@${host}:${remote}`,
  ];
}

function emulatorReachable() {
  return new Promise((resolve) => {
    const socket = net.createConnection(
      { host: cfg.EMULATOR_SSH_HOST, port: Number(cfg.EMULATOR_SSH_PORT), timeout: 3000 },
      () => {
        socket.end();
        resolve(true);
      },
    );
    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function sshEcho() {
  const res = spawnSync(openSshTool("ssh"), sshArgs("echo connected"), {
    encoding: "utf8",
    shell: false,
    stdio: "pipe",
    env: childEnv(),
  });
  return res.status === 0;
}

/** Эмулятор слушает SSH, но GUI/Wayland может ещё не подняться. */
function emulatorSessionReady() {
  const res = spawnSync(
    openSshTool("ssh"),
    sshArgs(
      "test -S /run/display/wayland-0 && test -d /run/user/100000 && echo session_ok",
    ),
    { encoding: "utf8", shell: false, stdio: "pipe", env: childEnv() },
  );
  return res.status === 0 && (res.stdout ?? "").includes("session_ok");
}

async function waitForEmulatorReady(wasColdStart) {
  const timeoutSec = Number(cfg.EMULATOR_BOOT_TIMEOUT) || 300;
  const deadline = Date.now() + timeoutSec * 1000;
  while (Date.now() < deadline) {
    if ((await emulatorReachable()) && sshEcho() && emulatorSessionReady()) {
      const warmupSec = wasColdStart ? Number(cfg.EMULATOR_WARMUP_SEC) || 15 : 0;
      if (warmupSec > 0) {
        log(`emulator: сессия готова, пауза ${warmupSec} с (холодный старт)…`);
        await sleep(warmupSec * 1000);
      }
      return;
    }
    await sleep(5000);
  }
  fail(
    `эмулятор не готов за ${timeoutSec} с (нужны SSH ${cfg.EMULATOR_SSH_HOST}:${cfg.EMULATOR_SSH_PORT} и Wayland /run/display/wayland-0)`,
  );
}

async function cmdEmulator() {
  const alreadyUp = sshEcho() && emulatorSessionReady();
  if (alreadyUp) {
    log("emulator: SSH и Wayland-сессия доступны, запуск не требуется");
    return;
  }

  if (sshEcho() && !emulatorSessionReady()) {
    log("emulator: SSH доступен, но Wayland ещё не готов — ожидание сессии…");
    await waitForEmulatorReady(false);
    log("emulator: готов");
    return;
  }

  log("emulator: SSH недоступен — запуск sfdk emulator start…");
  const child = spawn(sfdkPath(), ["emulator", "start"], {
    env: childEnv(),
    shell: false,
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  await waitForEmulatorReady(true);
  log("emulator: готов");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function cmdDeploy() {
  if (!cfg.EMULATOR_SSH_KEY || !fs.existsSync(cfg.EMULATOR_SSH_KEY)) {
    fail(
      "задайте EMULATOR_SSH_KEY в tools/aurora/local.env (см. local.env.example)",
    );
  }
  await cmdEmulator();
  const rpm = findRpm();
  const remoteRpm = `/tmp/${projectCfg.deployRpmName}`;
  run(openSshTool("scp"), scpArgs(rpm, remoteRpm));
  run(
    openSshTool("ssh"),
    sshArgs(
      `sudo rpm -Uvh --replacepkgs --define '__transaction_validation %{nil}' ${remoteRpm}`,
    ),
  );
  log("deploy: RPM установлен");
}

async function cmdRun() {
  await cmdEmulator();
  run(openSshTool("scp"), scpArgs(projectCfg.runScript, `/tmp/run-${project}.sh`));
  run(openSshTool("ssh"), sshArgs(`sudo sh /tmp/run-${project}.sh`));
}

async function cmdAll() {
  cmdBuild();
  await cmdDeploy();
  await cmdRun();
  log("all: готово");
}

async function main() {
  const cmd = process.argv[2];
  if (!cmd || !COMMANDS.includes(cmd)) {
    console.log(`Usage: node tools/aurora/poc.mjs <${COMMANDS.join("|")}> [project]`);
    console.log("");
    console.log("  project   poc-bridge (default) | container");
    console.log("");
    console.log("  sync      runtime/<project> → POC_BUILD_DIR");
    console.log("  build     sync + sfdk build");
    console.log("  deploy    emulator + scp + rpm -Uvh");
    console.log("  run       emulator + запуск + проверка journal");
    console.log("  emulator  поднять эмулятор, если SSH недоступен");
    console.log("  all       build + deploy + run");
    console.log("");
    console.log(
      `POC_BUILD_DIR (default): ${path.join(os.homedir(), "aurobore-spike", projectCfg.stagingName)}`,
    );
    console.log(`Config: ${path.join(__dirname, "local.env")} (see local.env.example)`);
    process.exit(cmd ? 1 : 0);
  }

  switch (cmd) {
    case "sync":
      cmdSync();
      break;
    case "build":
      cmdBuild();
      break;
    case "deploy":
      await cmdDeploy();
      break;
    case "run":
      await cmdRun();
      break;
    case "emulator":
      await cmdEmulator();
      break;
    case "all":
      await cmdAll();
      break;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
