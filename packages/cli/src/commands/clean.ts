import fs from "node:fs";
import path from "node:path";
import { runProjectCodegenFromConfig, loadConfig } from "@aurobore/build";
import { flagBool, type ParsedArgs } from "../args.js";

export function runGenerateCommand(args: ParsedArgs): number {
  if (flagBool(args.flags, "help")) {
    console.log("aurobore generate — перегенерировать PluginRegistry и aurobore-plugins.js");
    return 0;
  }

  try {
    const { config } = loadConfig(process.cwd());
    const refs = config.plugins ?? ["@aurobore/echo"];
    const { manifests } = runProjectCodegenFromConfig(process.cwd(), refs);
    console.log(`[generate] ${manifests.length} plugin(s) processed`);
    return 0;
  } catch (err) {
    console.error(`[generate] ERROR: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}

export function runCleanCommand(args: ParsedArgs): number {
  if (flagBool(args.flags, "help")) {
    console.log("aurobore clean — удалить .aurobore/");
    return 0;
  }

  const dir = path.join(process.cwd(), ".aurobore");
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log("[clean] removed .aurobore/");
  } else {
    console.log("[clean] nothing to clean");
  }
  return 0;
}
