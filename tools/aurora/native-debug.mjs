#!/usr/bin/env node
/**
 * Native debugging helpers for container on Aurora emulator.
 * journal, logs, stop, ssh, valgrind — см. docs/dev/native-debugging.md
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const BUILD_DIST = path.join(REPO_ROOT, "packages", "build", "dist", "index.js");

const JOURNAL_GREP =
  "aurobore-container|aurobore-bridge|aurobore-plugin|aurobore-web|aurobore-scope|poc-native";

const COMMANDS = [
  "journal",
  "logs",
  "stop",
  "ssh",
  "valgrind",
  "valgrind-fetch",
  "restart",
];

async function loadBuild() {
  if (!fs.existsSync(BUILD_DIST)) {
    throw new Error("@aurobore/build not compiled — run pnpm build first");
  }
  return import(pathToFileURL(BUILD_DIST).href);
}

function log(msg) {
  console.log(`[native-debug] ${msg}`);
}

function fail(msg) {
  console.error(`[native-debug] ERROR: ${msg}`);
  process.exit(1);
}

function scpArgs(cfg, local, remote) {
  return [
    "-i",
    cfg.EMULATOR_SSH_KEY,
    "-o",
    "StrictHostKeyChecking=no",
    "-P",
    cfg.EMULATOR_SSH_PORT,
    local,
    `${cfg.EMULATOR_SSH_USER}@${cfg.EMULATOR_SSH_HOST}:${remote}`,
  ];
}

function sshArgs(cfg, remoteCmd, { tty = false } = {}) {
  const args = [
    "-i",
    cfg.EMULATOR_SSH_KEY,
    "-o",
    "StrictHostKeyChecking=no",
    "-o",
    process.platform === "win32" ? "UserKnownHostsFile=NUL" : "UserKnownHostsFile=/dev/null",
    "-o",
    `ConnectTimeout=${cfg.EMULATOR_SSH_CONNECT_TIMEOUT}`,
    "-p",
    cfg.EMULATOR_SSH_PORT,
  ];
  if (tty) args.push("-t");
  args.push(`${cfg.EMULATOR_SSH_USER}@${cfg.EMULATOR_SSH_HOST}`);
  if (remoteCmd) args.push(remoteCmd);
  return args;
}

function runSsh(build, env, remoteCmd, { tty = false, inherit = true } = {}) {
  const res = spawnSync(openSshTool(build, env, "ssh"), sshArgs(env, remoteCmd, { tty }), {
    encoding: "utf8",
    shell: false,
    stdio: inherit ? "inherit" : "pipe",
    env: build.childEnv(env),
  });
  if (res.status !== 0) {
    fail(`ssh exit ${res.status ?? "unknown"}`);
  }
}

function openSshTool(build, env, tool) {
  return build.openSshTool(env, tool);
}

function parseJournalArgs(argv) {
  let lines = 120;
  let follow = true;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--snapshot" || arg === "--no-follow") {
      follow = false;
    } else if (arg === "-n" && argv[i + 1]) {
      lines = Number(argv[++i]) || lines;
      follow = false;
    } else if (arg.startsWith("-n") && arg.length > 2) {
      lines = Number(arg.slice(2)) || lines;
      follow = false;
    }
  }
  return { lines, follow };
}

function valgrindFetchPath() {
  return path.join(os.homedir(), "aurobore-spike", "valgrind-container.log");
}

async function main() {
  const cmd = process.argv[2];
  if (!cmd || !COMMANDS.includes(cmd)) {
    console.log(`Usage: node tools/aurora/native-debug.mjs <${COMMANDS.join("|")}> [args]`);
    console.log("Docs: docs/dev/native-debugging.md");
    process.exit(cmd ? 1 : 0);
  }

  const build = await loadBuild();
  const env = build.loadAuroraEnv({ stagingName: "aurobore-container" });

  if (!env.EMULATOR_SSH_KEY || !fs.existsSync(env.EMULATOR_SSH_KEY)) {
    fail("EMULATOR_SSH_KEY not set or missing (see tools/aurora/local.env.example)");
  }

  if (cmd !== "valgrind-fetch") {
    await build.ensureEmulator(env);
  }

  if (cmd === "journal") {
    const extra = process.argv.slice(3);
    const { lines, follow } = parseJournalArgs(extra);
    const jctl = follow
      ? "sudo journalctl -f --no-pager SYSLOG_IDENTIFIER=ru.auroraos.aurobore-container 2>/dev/null"
      : `sudo journalctl --no-pager -n ${lines} SYSLOG_IDENTIFIER=ru.auroraos.aurobore-container 2>/dev/null`;
    const remoteCmd = jctl;
    log(follow ? "journal follow (Ctrl+C to exit)" : `journal snapshot (last ${lines} lines)`);
    runSsh(build, env, remoteCmd, { tty: follow });
    return;
  }

  if (cmd === "logs") {
    log("tail -f /tmp/container.log (Ctrl+C to exit)");
    runSsh(build, env, "tail -f /tmp/container.log 2>/dev/null || echo '(no /tmp/container.log yet)'", {
      tty: true,
    });
    return;
  }

  if (cmd === "stop") {
    log("stopping ru.auroraos.aurobore-container");
    runSsh(
      build,
      env,
      "pkill -f ru.auroraos.aurobore-container 2>/dev/null || true; sleep 1; pgrep -f ru.auroraos.aurobore-container >/dev/null && echo 'still running' || echo 'stopped'",
    );
    return;
  }

  if (cmd === "ssh") {
    log(`SSH ${env.EMULATOR_SSH_USER}@${env.EMULATOR_SSH_HOST}:${env.EMULATOR_SSH_PORT}`);
    const child = spawn(openSshTool(build, env, "ssh"), sshArgs(env, undefined, { tty: true }), {
      stdio: "inherit",
      shell: false,
      env: build.childEnv(env),
    });
    child.on("exit", (code) => process.exit(code ?? 0));
    return;
  }

  if (cmd === "valgrind") {
    const script = path.join(__dirname, "valgrind-container.sh");
    const vgOpts = env.VALGRIND_OPTS?.trim();
    const exports = [`export EMULATOR_SESSION_WAIT_SEC=${env.EMULATOR_SESSION_WAIT_SEC || "90"}`];
    if (vgOpts) exports.push(`export VALGRIND_OPTS='${vgOpts.replace(/'/g, "'\\''")}'`);
    build.runCommand(openSshTool(build, env, "scp"), scpArgs(env, script, "/tmp/valgrind-container.sh"), {
      env: build.childEnv(env),
    });
    log("starting Valgrind on emulator (slow; close app when done)");
    const remoteCmd = `${exports.join("; ")}; chmod +x /tmp/valgrind-container.sh && sudo -E sh /tmp/valgrind-container.sh`;
    runSsh(build, env, remoteCmd, { tty: true });
    return;
  }

  if (cmd === "valgrind-fetch") {
    const dest = valgrindFetchPath();
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    log(`fetching /tmp/valgrind-container.log → ${dest}`);
    const res = spawnSync(
      openSshTool(build, env, "scp"),
      [
        "-i",
        env.EMULATOR_SSH_KEY,
        "-o",
        "StrictHostKeyChecking=no",
        "-P",
        env.EMULATOR_SSH_PORT,
        `${env.EMULATOR_SSH_USER}@${env.EMULATOR_SSH_HOST}:/tmp/valgrind-container.log`,
        dest,
      ],
      { stdio: "inherit", shell: false, env: build.childEnv(env) },
    );
    if (res.status !== 0) {
      fail("fetch failed — run pnpm container:valgrind first");
    }
    log(`saved: ${dest}`);
    return;
  }

  if (cmd === "restart") {
    log("stop + container:run");
    runSsh(build, env, "pkill -f ru.auroraos.aurobore-container 2>/dev/null || true", {
      inherit: false,
    });
    const poc = path.join(__dirname, "poc.mjs");
    const res = spawnSync(process.execPath, [poc, "run", "container"], {
      cwd: REPO_ROOT,
      stdio: "inherit",
    });
    process.exit(res.status ?? 1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
