import { spawn, type ChildProcess } from "node:child_process";
import type { AuroraEnv } from "./env.js";
import { childEnv, openSshTool } from "./env.js";
import { isPortAvailable, probeTcpHost } from "../dev/networkProbe.js";

export const DEFAULT_CEF_DEBUG_PORT = 9222;

export interface CefDebugTunnel {
  localPort: number;
  remotePort: number;
  pid?: number;
  stop(): Promise<void>;
}

export interface StartCefDebugTunnelOptions {
  localPort?: number;
  /** Keep SSH tunnel alive after the parent Node process exits (container:run). */
  detached?: boolean;
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
  options: StartCefDebugTunnelOptions = {},
): Promise<CefDebugTunnel> {
  const localPort = options.localPort ?? remotePort;
  const detached = options.detached ?? false;
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

  const proc = spawn(openSshTool(env, "ssh"), tunnelSshArgs(env, validLocal, validRemote), {
    env: childEnv(env),
    shell: false,
    stdio: "ignore",
    detached,
  });

  await new Promise<void>((resolve, reject) => {
    proc.once("error", reject);
    proc.once("spawn", () => {
      if (detached) proc.unref();
      resolve();
    });
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
        pid: proc.pid,
        stop: () => stopTunnel(proc),
      };
    }
    if (proc.exitCode != null) {
      break;
    }
  }

  await stopTunnel(proc);
  throw new Error(`CEF debug SSH tunnel failed to bind localhost:${validLocal}`);
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
  console.log("[cef-debug]   chrome://inspect — смотрите секцию «Remote Target», НЕ «Devices» (USB)");
  console.log("[cef-debug]   Discover network targets → Configure → добавьте ОБА:");
  console.log(`[cef-debug]     127.0.0.1:${localPort}`);
  console.log(`[cef-debug]     localhost:${localPort}`);
  console.log("[cef-debug]   Если список пуст — используйте прямую ссылку inspect ниже");
  console.log(`[cef-debug] Verify: curl http://127.0.0.1:${localPort}/json/list`);
  console.log("");
}

export interface CefDebugTarget {
  title: string;
  url: string;
  inspectUrl: string;
}

/** Список inspectable страниц CEF через локальный туннель. */
export async function fetchCefDebugTargets(localPort: number): Promise<CefDebugTarget[]> {
  const res = await fetch(`http://127.0.0.1:${localPort}/json/list`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) {
    throw new Error(`json/list HTTP ${res.status}`);
  }
  const items = (await res.json()) as Array<{
    title: string;
    url: string;
    type: string;
    devtoolsFrontendUrl: string;
  }>;
  return items
    .filter((item) => item.type === "page" && !item.url.startsWith("chrome-extension://"))
    .map((item) => ({
      title: item.title,
      url: item.url,
      inspectUrl: item.devtoolsFrontendUrl.startsWith("http")
        ? item.devtoolsFrontendUrl
        : `http://127.0.0.1:${localPort}${item.devtoolsFrontendUrl}`,
    }));
}

/** Печатает прямые ссылки inspect (обход пустого chrome://inspect). */
export function printInspectableTargets(targets: CefDebugTarget[]): void {
  if (targets.length === 0) {
    console.log("[cef-debug] WebView targets: (пока нет — дождитесь загрузки приложения)");
    return;
  }
  console.log("[cef-debug] WebView targets — вставьте ссылку в адресную строку Chrome:");
  for (const target of targets) {
    console.log(`[cef-debug]   ${target.title} (${target.url})`);
    console.log(`[cef-debug]     ${target.inspectUrl}`);
  }
  console.log("");
}

/** Ждёт появления WebView в json/list и печатает прямые ссылки. */
export async function waitAndPrintInspectableTargets(
  localPort: number,
  timeoutMs = 20000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const targets = await fetchCefDebugTargets(localPort);
      if (targets.length > 0) {
        printInspectableTargets(targets);
        return;
      }
    } catch {
      /* retry until timeout */
    }
    await sleep(1000);
  }
  console.log(
    "[cef-debug] targets not found in json/list — проверьте, что приложение с WebView запущено на эмуляторе",
  );
}
