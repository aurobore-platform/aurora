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
const POC_SOURCE = path.join(REPO_ROOT, "runtime", "poc-bridge");
const RUN_SCRIPT = path.join(__dirname, "run-poc.sh");

const COMMANDS = ["sync", "build", "deploy", "run", "emulator", "all"];

/** @type {Record<string, string>} */
const cfg = loadConfig();

function loadConfig() {
  /** @type {Record<string, string>} */
  const env = {
    SFDK_TARGET: "AuroraOS-5.2.1.200-x86_64",
    EMULATOR_SSH_USER: "defaultuser",
    EMULATOR_SSH_HOST: "127.0.0.1",
    EMULATOR_SSH_PORT: "2223",
    EMULATOR_BOOT_TIMEOUT: "300",
    EMULATOR_SSH_CONNECT_TIMEOUT: "5",
    POC_RPM_GLOB: "ru.auroraos.poc-bridge-*.rpm",
    ...process.env,
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
    env.POC_BUILD_DIR = path.join(os.homedir(), "aurobore-spike", "poc-bridge");
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
  console.log(`[poc] ${msg}`);
}

function fail(msg) {
  console.error(`[poc] ERROR: ${msg}`);
  process.exit(1);
}

/** @returns {NodeJS.ProcessEnv} */
function sfdkEnv() {
  const env = { ...process.env };
  if (cfg.AURORA_SDK_BIN) {
    env.PATH = `${cfg.AURORA_SDK_BIN}${path.delimiter}${env.PATH ?? ""}`;
  }
  return env;
}

function sfdkBin() {
  return process.platform === "win32" ? "sfdk.exe" : "sfdk";
}

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ cwd?: string; inherit?: boolean; allowCodes?: number[] }} [opts]
 */
function run(cmd, args, opts = {}) {
  log(`${cmd} ${args.join(" ")}`);
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd,
    env: sfdkEnv(),
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: opts.inherit ? "inherit" : "pipe",
  });
  const ok =
    res.status === 0 || (opts.allowCodes != null && opts.allowCodes.includes(res.status ?? -1));
  if (!ok) {
    if (!opts.inherit) {
      if (res.stdout) process.stdout.write(res.stdout);
      if (res.stderr) process.stderr.write(res.stderr);
    }
    fail(`команда завершилась с кодом ${res.status}: ${cmd} ${args.join(" ")}`);
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
  const src = POC_SOURCE;
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
      inherit: true,
      allowCodes: [0, 1, 2, 3, 4, 5, 6, 7],
    });
  } else {
    run("rsync", ["-a", "--delete", "--exclude", "RPMS/", `${src}/`, `${dst}/`], {
      inherit: true,
    });
  }
  log(`sync: ${src} → ${dst}`);
}

function cmdBuild() {
  cmdSync();
  const cwd = cfg.POC_BUILD_DIR;
  run(sfdkBin(), ["-c", `target=${cfg.SFDK_TARGET}`, "build"], { cwd, inherit: true });

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
  const glob = cfg.POC_RPM_GLOB.replace(/\*/g, ".*");
  const re = new RegExp(`^${glob}$`);
  const rpms = fs.existsSync(rpmsDir)
    ? fs.readdirSync(rpmsDir).filter((f) => re.test(f))
    : [];
  if (rpms.length === 0) fail(`RPM не найден: ${rpmsDir}/${cfg.POC_RPM_GLOB}`);
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
  const res = spawnSync("ssh", sshArgs("echo connected"), {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: "pipe",
  });
  return res.status === 0;
}

async function cmdEmulator() {
  if (sshEcho()) {
    log("emulator: SSH доступен, запуск не требуется");
    return;
  }

  log("emulator: SSH недоступен — запуск sfdk emulator start…");
  const child = spawn(sfdkBin(), ["emulator", "start"], {
    env: sfdkEnv(),
    shell: process.platform === "win32",
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  const timeoutSec = Number(cfg.EMULATOR_BOOT_TIMEOUT) || 300;
  const deadline = Date.now() + timeoutSec * 1000;
  while (Date.now() < deadline) {
    await sleep(5000);
    if ((await emulatorReachable()) && sshEcho()) {
      log("emulator: готов");
      return;
    }
  }
  fail(
    `эмулятор не ответил за ${timeoutSec} с (проверьте ${cfg.EMULATOR_SSH_HOST}:${cfg.EMULATOR_SSH_PORT})`,
  );
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
  run("scp", scpArgs(rpm, "/tmp/poc-bridge.rpm"), { inherit: true });
  run(
    "ssh",
    sshArgs(
      "sudo rpm -Uvh --replacepkgs --define '__transaction_validation %{nil}' /tmp/poc-bridge.rpm",
    ),
    { inherit: true },
  );
  log("deploy: RPM установлен");
}

async function cmdRun() {
  await cmdEmulator();
  run("scp", scpArgs(RUN_SCRIPT, "/tmp/run-poc.sh"), { inherit: true });
  run("ssh", sshArgs("sudo sh /tmp/run-poc.sh"), { inherit: true });
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
    console.log(`Usage: node tools/aurora/poc.mjs <${COMMANDS.join("|")}>`);
    console.log("");
    console.log("  sync      repo/runtime/poc-bridge → POC_BUILD_DIR");
    console.log("  build     sync + sfdk build");
    console.log("  deploy    emulator + scp + rpm -Uvh");
    console.log("  run       emulator + запуск PoC + проверка journal");
    console.log("  emulator  поднять эмулятор, если SSH недоступен");
    console.log("  all       build + deploy + run");
    console.log("");
    console.log(
      `POC_BUILD_DIR (default): ${path.join(os.homedir(), "aurobore-spike", "poc-bridge")}`,
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
