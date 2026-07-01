import fs from "node:fs";
import path from "node:path";
import {
  buildApp,
  loadConfig,
  printDevBanner,
  resolveDevWebRoot,
  runApp,
  startDevBackend,
} from "@aurobore/build";
import { flagBool, flagString, type ParsedArgs } from "../args.js";

export async function runDevCommand(args: ParsedArgs): Promise<number> {
  if (flagBool(args.flags, "help") || flagBool(args.flags, "h")) {
    console.log(`aurobore dev — dev server + HMR/live reload + run на эмуляторе

Options:
  --port <n>       Dev server port (default from config)
  --no-run         Только dev server, без deploy
  --static         Принудительно static SSE reload (без Vite HMR)
`);
    return 0;
  }

  try {
    const cwd = process.cwd();
    const { config } = loadConfig(cwd);
    const port = Number(flagString(args.flags, "port") ?? config.web.devServer?.port ?? 5173);
    const webRoot = resolveDevWebRoot(cwd, config.web.root);

    if (!fs.existsSync(webRoot)) {
      console.error(`[dev] web root not found: ${webRoot}`);
      return 1;
    }

    const backend = await startDevBackend({
      projectRoot: cwd,
      config,
      port,
      forceStatic: flagBool(args.flags, "static"),
    });
    printDevBanner(backend);

    if (!flagBool(args.flags, "no-run")) {
      console.log(`[dev] building dev container (entry: ${backend.url})`);
      await buildApp({ mode: "dev", devEntryUrl: backend.url });
      await runApp({});
    }

    console.log("[dev] watching… (Ctrl+C to stop)");
    await new Promise(() => {});
    return 0;
  } catch (err) {
    console.error(`[dev] ERROR: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}
