import { spawn, spawnSync } from "node:child_process";
import net from "node:net";
import type { AuroraEnv } from "./env.js";
import { childEnv, openSshTool, resolveSfdkPath } from "./env.js";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function sshArgs(cfg: AuroraEnv, remoteCmd?: string): string[] {
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
    `${cfg.EMULATOR_SSH_USER}@${cfg.EMULATOR_SSH_HOST}`,
  ];
  if (remoteCmd) args.push(remoteCmd);
  return args;
}

function sshEcho(cfg: AuroraEnv): boolean {
  const res = spawnSync(openSshTool(cfg, "ssh"), sshArgs(cfg, "echo connected"), {
    encoding: "utf8",
    shell: false,
    stdio: "pipe",
    env: childEnv(cfg),
  });
  return res.status === 0;
}

function emulatorSessionReady(cfg: AuroraEnv): boolean {
  const res = spawnSync(
    openSshTool(cfg, "ssh"),
    sshArgs(cfg, "test -S /run/display/wayland-0 && test -d /run/user/100000 && echo session_ok"),
    { encoding: "utf8", shell: false, stdio: "pipe", env: childEnv(cfg) },
  );
  return res.status === 0 && (res.stdout ?? "").includes("session_ok");
}

function emulatorReachable(cfg: AuroraEnv): Promise<boolean> {
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

async function waitForEmulatorReady(cfg: AuroraEnv, wasColdStart: boolean): Promise<void> {
  const timeoutSec = Number(cfg.EMULATOR_BOOT_TIMEOUT) || 300;
  const deadline = Date.now() + timeoutSec * 1000;
  while (Date.now() < deadline) {
    if ((await emulatorReachable(cfg)) && sshEcho(cfg) && emulatorSessionReady(cfg)) {
      const warmupSec = wasColdStart ? Number(cfg.EMULATOR_WARMUP_SEC) || 15 : 0;
      if (warmupSec > 0) await sleep(warmupSec * 1000);
      return;
    }
    await sleep(5000);
  }
  throw new Error(
    `emulator not ready within ${timeoutSec}s (SSH ${cfg.EMULATOR_SSH_HOST}:${cfg.EMULATOR_SSH_PORT})`,
  );
}

/** Поднимает эмулятор при необходимости и ждёт готовности сессии. */
export async function ensureEmulator(cfg: AuroraEnv): Promise<void> {
  if (sshEcho(cfg) && emulatorSessionReady(cfg)) return;

  if (sshEcho(cfg) && !emulatorSessionReady(cfg)) {
    await waitForEmulatorReady(cfg, false);
    return;
  }

  const child = spawn(resolveSfdkPath(cfg), ["emulator", "start"], {
    env: childEnv(cfg),
    shell: false,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
  await waitForEmulatorReady(cfg, true);
}

export function scpArgs(cfg: AuroraEnv, local: string, remote: string): string[] {
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

export { sshArgs, sshEcho, emulatorSessionReady };
