import fs from "node:fs";
import path from "node:path";
import { buildApp, loadConfig, runApp, startDevServer, resolveDevHost } from "@aurobore/build";
import { flagBool, flagString, type ParsedArgs } from "../args.js";

export async function runDevCommand(args: ParsedArgs): Promise<number> {
  if (flagBool(args.flags, "help") || flagBool(args.flags, "h")) {
    console.log(`aurobore dev — dev server + live reload + run на эмуляторе

Options:
  --port <n>       Dev server port (default from config)
  --no-run         Только dev server, без deploy
`);
    return 0;
  }

  try {
    const { config } = loadConfig(process.cwd());
    const port = Number(flagString(args.flags, "port") ?? config.web.devServer?.port ?? 5173);
    const webRoot = path.join(process.cwd(), config.web.root === "dist" ? "src" : config.web.root);

    if (!fs.existsSync(webRoot)) {
      console.error(`[dev] web root not found: ${webRoot}`);
      return 1;
    }

    const host = resolveDevHost();
    const entryUrl = `http://${host}:${port}/${config.web.entry.replace(/^\//, "")}`;

    startDevServer({ root: webRoot, port, host: "0.0.0.0" });

    if (!flagBool(args.flags, "no-run")) {
      console.log(`[dev] building dev container (entry: ${entryUrl})`);
      buildApp({ mode: "dev", devEntryUrl: entryUrl });
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
