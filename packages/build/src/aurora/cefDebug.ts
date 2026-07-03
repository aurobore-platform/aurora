import { spawn, type ChildProcess } from "node:child_process";
import type { AuroraEnv } from "./env.js";
import { childEnv, openSshTool } from "./env.js";
import { isPortAvailable, probeTcpHost } from "../dev/networkProbe.js";

export const DEFAULT_CEF_DEBUG_PORT = 9222;

export interface CefDebugTunnel {
  localPort: number;
  remotePort: number;
  stop(): Promise<void>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validatePort(port: number): number | null {
  if (Number.isInteger(port) && port > 0 && port <= 65535) return port;
  return null;
}

/** Разрешает порт CEF DevTools для dev-сессии. */
export function resolveCefDebugPort(opts: {
  explicit?: number | null;
  envPort?: string;
  devMode?: boolean;
  disabled?: boolean;
}): number | null {
  if (opts.disabled) return null;

  if (opts.explicit != null) {
    return validatePort(opts.explicit);
  }

  const envPort = opts.envPort?.trim();
  if (envPort) {
    const parsed = Number.parseInt(envPort, 10);
    if (!Number.isNaN(parsed)) return validatePort(parsed);
    return null;
  }

  if (opts.devMode) return DEFAULT_CEF_DEBUG_PORT;
  return null;
}

function tunnelSshArgs(cfg: AuroraEnv, localPort: number, remotePort: number): string[] {
  return [
    "-i",
    cfg.EMULATOR_SSH_KEY,
    "-o",
    "StrictHostKeyChecking=no",
    "-o",
    process.platform === "win32" ? "UserKnownHostsFile=NUL" : "UserKnownHostsFile=/dev/null",
    "-o",
    `ConnectTimeout=${cfg.EMULATOR_SSH_CONNECT_TIMEOUT}`,
    "-N",
    "-L",
    `${localPort}:127.0.0.1:${remotePort}`,
    "-p",
    cfg.EMULATOR_SSH_PORT,
    `${cfg.EMULATOR_SSH_USER}@${cfg.EMULATOR_SSH_HOST}`,
  ];
}

/** Поднимает SSH-туннель localhost:localPort → device:remotePort для chrome://inspect. */
export async function startCefDebugTunnel(
  env: AuroraEnv,
  remotePort: number,
  localPort = remotePort,
): Promise<CefDebugTunnel> {
  if (!env.EMULATOR_SSH_KEY) {
    throw new Error("EMULATOR_SSH_KEY not set (see tools/aurora/local.env.example)");
  }

  const validRemote = validatePort(remotePort);
  const validLocal = validatePort(localPort);
  if (validRemote == null || validLocal == null) {
    throw new Error(`invalid CEF debug port (local=${localPort}, remote=${remotePort})`);
  }

  if (!(await isPortAvailable(validLocal))) {
    throw new Error(
      `localhost:${validLocal} is busy — close another ssh -L tunnel or use --cef-debug-port`,
    );
  }

  let stderr = "";
  const proc = spawn(openSshTool(env, "ssh"), tunnelSshArgs(env, validLocal, validRemote), {
    env: childEnv(env),
    shell: false,
    stdio: ["ignore", "ignore", "pipe"],
  });

  proc.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });

  await new Promise<void>((resolve, reject) => {
    proc.once("error", reject);
    proc.once("spawn", () => resolve());
  });

  for (let attempt = 0; attempt < 10; attempt++) {
    await sleep(300);
    if (await probeTcpHost("127.0.0.1", validLocal, 500)) {
      console.log(
        `[cef-debug] SSH tunnel active: localhost:${validLocal} → ${env.EMULATOR_SSH_HOST}:${validRemote}`,
      );
      return {
        localPort: validLocal,
        remotePort: validRemote,
        stop: () => stopTunnel(proc),
      };
    }
    if (proc.exitCode != null) {
      break;
    }
  }

  await stopTunnel(proc);
  const detail = stderr.trim() ? `: ${stderr.trim()}` : "";
  throw new Error(`CEF debug SSH tunnel failed to bind localhost:${validLocal}${detail}`);
}

async function stopTunnel(child: ChildProcess | null): Promise<void> {
  if (!child || child.exitCode != null) return;

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 3000);

    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });

    child.kill("SIGTERM");
  });
}

/** Инструкции для подключения Chrome DevTools к WebView. */
export function printCefDebugBanner(localPort: number): void {
  console.log("");
  console.log("[cef-debug] Chrome DevTools (CEF remote debugging)");
  console.log(`[cef-debug]   1. Open chrome://inspect in desktop Chrome`);
  console.log(`[cef-debug]   2. Configure → add localhost:${localPort} if missing`);
  console.log("[cef-debug]   3. Start the app WebView — a remote target should appear");
  console.log(`[cef-debug] Verify tunnel: curl http://localhost:${localPort}/json/version`);
  console.log("[cef-debug] Do not open http://localhost:9222 in the browser tab (deprecated in CEF 100+)");
  console.log("");
}
