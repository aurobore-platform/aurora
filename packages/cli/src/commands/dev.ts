import fs from "node:fs";
import path from "node:path";
import {
  buildApp,
  loadAuroraEnv,
  loadConfig,
  printCefDebugBanner,
  printDevBanner,
  resolveCefDebugPort,
  resolveDevWebRoot,
  runApp,
  startCefDebugTunnel,
  startDevBackend,
  waitAndPrintInspectableTargets,
  type CefDebugTunnel,
  type DevBackendResult,
} from "@aurobore/build";
import { flagBool, flagString, type ParsedArgs } from "../args.js";

export async function runDevCommand(args: ParsedArgs): Promise<number> {
  if (flagBool(args.flags, "help") || flagBool(args.flags, "h")) {
    console.log(`aurobore dev — dev server + HMR/live reload + run на эмуляторе

Options:
  --port <n>           Dev server port (default from config)
  --no-run             Только dev server, без deploy
  --static             Принудительно static SSE reload (без Vite HMR)
  --no-cef-debug       Без CEF remote debugging и SSH-туннеля
  --cef-debug-port <n> Порт CEF DevTools (default: 9222)
`);
    return 0;
  }

  let backend: DevBackendResult | undefined;
  let tunnel: CefDebugTunnel | undefined;
  let shuttingDown = false;

  const shutdown = async (code = 0): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    try {
      await tunnel?.stop();
    } catch {
      /* ignore */
    }
    try {
      await backend?.stop?.();
    } catch {
      /* ignore */
    }
    process.exit(code);
  };

  process.on("SIGINT", () => void shutdown(0));
  process.on("SIGTERM", () => void shutdown(0));

  try {
    const cwd = process.cwd();
    const { config } = loadConfig(cwd);
    const port = Number(flagString(args.flags, "port") ?? config.web.devServer?.port ?? 5173);
    const webRoot = resolveDevWebRoot(cwd, config.web.root);

    if (!fs.existsSync(webRoot)) {
      console.error(`[dev] web root not found: ${webRoot}`);
      return 1;
    }

    const auroraEnv = loadAuroraEnv({ projectRoot: cwd, stagingName: config.app.id });
    const cefDebugPort = resolveCefDebugPort({
      disabled: flagBool(args.flags, "no-cef-debug"),
      explicit: flagString(args.flags, "cef-debug-port")
        ? Number(flagString(args.flags, "cef-debug-port"))
        : undefined,
      envPort: auroraEnv.AUROBORE_CEF_DEBUG_PORT ?? process.env.AUROBORE_CEF_DEBUG_PORT,
      devMode: true,
    });

    backend = await startDevBackend({
      projectRoot: cwd,
      config,
      port,
      forceStatic: flagBool(args.flags, "static"),
    });
    printDevBanner(backend);

    if (!flagBool(args.flags, "no-run")) {
      console.log(`[dev] building dev container (entry: ${backend.url})`);
      await buildApp({ mode: "dev", devEntryUrl: backend.url, projectRoot: cwd });

      if (cefDebugPort != null) {
        tunnel = await startCefDebugTunnel(auroraEnv, cefDebugPort);
        printCefDebugBanner(tunnel.localPort);
      }

      await runApp({ projectRoot: cwd, cefDebugPort: cefDebugPort ?? undefined });

      if (cefDebugPort != null && tunnel) {
        await waitAndPrintInspectableTargets(tunnel.localPort);
      }
    } else if (cefDebugPort != null) {
      console.log(
        "[dev] CEF debug port resolved but --no-run: start app manually and run SSH tunnel if needed",
      );
    }

    console.log("[dev] watching… (Ctrl+C to stop)");
    await new Promise(() => {});
    return 0;
  } catch (err) {
    console.error(`[dev] ERROR: ${err instanceof Error ? err.message : String(err)}`);
    await shutdown(1);
    return 1;
  }
}
