import { spawn, type ChildProcess } from "node:child_process";
import type { AuroraEnv } from "./env.js";
import { childEnv, openSshTool } from "./env.js";
import { isPortAvailable, probeTcpHost } from "../dev/networkProbe.js";

export const DEFAULT_CEF_DEBUG_PORT = 9222;

/** Относительный путь к документации (от корня репозитория). */
export const CEF_DEBUG_DOC_REL = "docs/dev/web-debugging.md";

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

/** Краткий заголовок перед блоком journal в run-container.sh (на устройстве). */
export function printCefDebugJournalHeader(devicePort: number): void {
  console.log("=== CEF DEBUG (WebView / Chrome DevTools) ===");
  console.log(`Device listens: 127.0.0.1:${devicePort}`);
  console.log("On PC: chrome://inspect → section «Remote Target» (not USB Devices)");
  console.log(`Full guide: ${CEF_DEBUG_DOC_REL}`);
  console.log("=============================================");
}

/** Как включить CEF debug, если AUROBORE_CEF_DEBUG_PORT не задан. */
export function printCefDebugSetupInstructions(): void {
  console.log("");
  console.log("[cef-debug] Chrome DevTools (CEF) — не включён");
  console.log("[cef-debug]   1. tools/aurora/local.env → AUROBORE_CEF_DEBUG_PORT=9222");
  console.log("[cef-debug]   2. pnpm container:build && pnpm container:run");
  console.log(`[cef-debug]   Guide: ${CEF_DEBUG_DOC_REL}`);
  console.log("");
}

/** SSH-туннель вручную, если автоподнятие не удалось (порт занят и т.п.). */
export function printCefDebugManualTunnel(env: AuroraEnv, port: number): void {
  const key = env.EMULATOR_SSH_KEY || "<EMULATOR_SSH_KEY>";
  console.log("[cef-debug] Manual SSH tunnel (separate PowerShell window):");
  console.log(
    `[cef-debug]   ssh -i ${key} -N -L ${port}:127.0.0.1:${port} -p ${env.EMULATOR_SSH_PORT} ${env.EMULATOR_SSH_USER}@${env.EMULATOR_SSH_HOST}`,
  );
}

export interface CefDebugTarget {
  title: string;
  url: string;
  inspectUrl: string;
}

export interface PickCefTargetOptions {
  /** Подстрока в title (default: «Aurobore Container»). */
  titleIncludes?: string;
  /** Подстрока в page URL (default: «127.0.0.1» — loopback asset server). */
  urlIncludes?: string;
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

/** Выбирает WebView-страницу приложения среди targets json/list. */
export function pickPreferredCefTarget(
  targets: CefDebugTarget[],
  options: PickCefTargetOptions = {},
): CefDebugTarget | null {
  if (targets.length === 0) return null;
  const titleNeedle = (options.titleIncludes ?? "Aurobore Container").toLowerCase();
  const urlNeedle = (options.urlIncludes ?? "127.0.0.1").toLowerCase();

  const byTitle = targets.find((t) => t.title.toLowerCase().includes(titleNeedle));
  if (byTitle) return byTitle;

  const byUrl = targets.find((t) => t.url.toLowerCase().includes(urlNeedle));
  if (byUrl) return byUrl;

  return targets[0] ?? null;
}

/** Печатает готовую ссылку DevTools (primary output после container:run / aurobore dev). */
export function printCefInspectUrl(target: CefDebugTarget, localPort: number): void {
  console.log("");
  console.log("[cef-debug] DevTools — вставьте в адресную строку Google Chrome:");
  console.log(`[cef-debug] ${target.inspectUrl}`);
  console.log(`[cef-debug] (${target.title} | ${target.url})`);
  console.log(
    `[cef-debug] Источник: http://127.0.0.1:${localPort}/json/list · опционально chrome://inspect`,
  );
  console.log("");
}

/** Ждёт WebView в json/list, выбирает по title/URL и печатает inspectUrl. */
export async function resolveAndPrintCefInspectUrl(
  localPort: number,
  options: PickCefTargetOptions & { timeoutMs?: number } = {},
): Promise<CefDebugTarget | null> {
  const timeoutMs = options.timeoutMs ?? 20000;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const targets = await fetchCefDebugTargets(localPort);
      const picked = pickPreferredCefTarget(targets, options);
      if (picked) {
        printCefInspectUrl(picked, localPort);
        if (targets.length > 1) {
          console.log("[cef-debug] Прочие targets:");
          for (const t of targets) {
            if (t.inspectUrl !== picked.inspectUrl) {
              console.log(`[cef-debug]   ${t.title}: ${t.inspectUrl}`);
            }
          }
          console.log("");
        }
        return picked;
      }
    } catch {
      /* retry until timeout */
    }
    await sleep(1000);
  }

  console.log(
    `[cef-debug] WebView не найден в http://127.0.0.1:${localPort}/json/list (таймаут ${timeoutMs}ms)`,
  );
  console.log("[cef-debug] Проверьте SSH-туннель и что приложение с WebView запущено");
  return null;
}

/** @deprecated Используйте resolveAndPrintCefInspectUrl */
export function printCefDebugBanner(_localPort: number): void {
  /* no-op: banner заменён автоподбором inspect URL */
}

/** @deprecated Используйте resolveAndPrintCefInspectUrl */
export function printInspectableTargets(targets: CefDebugTarget[]): void {
  const picked = pickPreferredCefTarget(targets);
  if (picked) printCefInspectUrl(picked, DEFAULT_CEF_DEBUG_PORT);
}

/** @deprecated Используйте resolveAndPrintCefInspectUrl */
export async function waitAndPrintInspectableTargets(
  localPort: number,
  timeoutMs = 20000,
): Promise<void> {
  await resolveAndPrintCefInspectUrl(localPort, { timeoutMs });
}

/** Пробует json/list на уже открытом localhost:port (например, если SSH-туннель уже был). */
export async function tryResolveAndPrintCefInspectUrl(
  localPort: number,
  options: PickCefTargetOptions & { timeoutMs?: number } = {},
): Promise<CefDebugTarget | null> {
  if (!(await probeTcpHost("127.0.0.1", localPort, 500))) return null;
  return resolveAndPrintCefInspectUrl(localPort, options);
}
