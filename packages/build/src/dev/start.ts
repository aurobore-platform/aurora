import path from "node:path";
import type { AuroboreConfig } from "../config/types.js";
import { materializeDevAssets } from "./bridgeAssets.js";
import { detectDevBackend, resolveDevWebRoot, type DevBackendKind } from "./detect.js";
import { startEsbuildDevServer } from "./esbuild.js";
import { resolveDevHost, startDevServer } from "./server.js";
import { startViteDevServer } from "./vite.js";

export interface StartDevBackendOptions {
  projectRoot: string;
  config: AuroboreConfig;
  port: number;
  forceStatic?: boolean;
  webMode?: boolean;
}

export interface DevBackendResult {
  url: string;
  port: number;
  backend: DevBackendKind;
  webMode: boolean;
  stop?: () => Promise<void>;
}

/** Поднимает dev backend (vite / esbuild / static) и materialize bridge assets. */
export async function startDevBackend(options: StartDevBackendOptions): Promise<DevBackendResult> {
  const { projectRoot, config, port, forceStatic, webMode } = options;
  const assets = materializeDevAssets(projectRoot, { webMode });
  const backend = detectDevBackend(projectRoot, forceStatic);
  const lanHost = webMode ? "127.0.0.1" : resolveDevHost();
  const entryPath = config.web.entry.replace(/^\//, "");

  if (backend === "vite") {
    try {
      const result = await startViteDevServer({
        projectRoot,
        port,
        assetsDir: assets.root,
        webMode,
      });
      const url = result.url.endsWith("/") ? `${result.url}${entryPath}` : `${result.url}/${entryPath}`;
      return { url, port: result.port, backend, webMode: !!webMode, stop: result.stop };
    } catch (err) {
      console.warn(
        `[dev] Vite failed (${err instanceof Error ? err.message : String(err)}); falling back to static`,
      );
    }
  } else if (backend === "esbuild") {
    const result = await startEsbuildDevServer({
      projectRoot,
      port,
      webMode,
      host: webMode ? "127.0.0.1" : undefined,
    });
    return { url: result.url, port: result.port, backend, webMode: !!webMode, stop: result.stop };
  }

  const webRoot = resolveDevWebRoot(projectRoot, config.web.root);
  startDevServer({
    root: webRoot,
    port,
    host: webMode ? "127.0.0.1" : "0.0.0.0",
    assetsDir: assets.root,
    webMode,
  });
  const url = `http://${lanHost}:${port}/${entryPath}`;
  return { url, port, backend: "static", webMode: !!webMode };
}

/** Печатает startup banner для aurobore dev. */
export function printDevBanner(result: DevBackendResult): void {
  const modeLabel =
    result.backend === "vite" ? "HMR (Vite)" : result.backend === "esbuild" ? "live reload (esbuild)" : "live reload (static)";

  if (result.webMode) {
    console.log(`[dev] mode: ${modeLabel} — browser mock`);
    console.log(`[dev] entry: ${result.url}`);
    console.log("[dev] plugin calls use in-memory mocks (no emulator/SDK)");
    return;
  }

  console.log(`[dev] mode: ${modeLabel}`);
  console.log(`[dev] entry: ${result.url}`);
  console.log("[dev] emulator must reach this host — run `aurobore doctor` if WebView is blank");
  console.log("[dev] native/plugin changes require restarting `aurobore dev` (container rebuild)");
}
