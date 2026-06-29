import {
  findConfigFile,
  loadConfig,
  resolveEffectiveConfig,
  resolvePluginManifests,
  resolvePluginRefs,
  validateConfig,
  findMonorepoRoot,
} from "@aurobore/build";
import fs from "node:fs";
import { flagBool, type ParsedArgs } from "../args.js";

export function runConfigCommand(args: ParsedArgs): number {
  if (flagBool(args.flags, "help") || flagBool(args.flags, "h")) {
    console.log(`aurobore config — показать или провалидировать конфигурацию

Использование: aurobore config [validate]
`);
    return 0;
  }

  const sub = args.positional[0] ?? "show";
  const configPath = findConfigFile(process.cwd());

  if (!configPath) {
    console.error("[config] aurobore.config.json не найден в текущем каталоге");
    return 1;
  }

  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const errors = validateConfig(raw);

  if (sub === "validate") {
    if (errors.length > 0) {
      for (const e of errors) {
        console.error(`[config] ${e.path}: ${e.message}`);
      }
      return 1;
    }
    console.log("[config] OK");
    return 0;
  }

  if (errors.length > 0) {
    console.error("[config] конфиг содержит ошибки:");
    for (const e of errors) {
      console.error(`  ${e.path}: ${e.message}`);
    }
    return 1;
  }

  const { config } = loadConfig(process.cwd());
  const pluginsForCodegen = resolvePluginRefs(config.plugins);
  let effective;
  try {
    const monorepo = findMonorepoRoot(process.cwd()) ?? undefined;
    const manifests = resolvePluginManifests(process.cwd(), pluginsForCodegen, monorepo);
    effective = resolveEffectiveConfig(config, manifests);
  } catch {
    effective = resolveEffectiveConfig(config, []);
  }

  console.log(JSON.stringify(effective, null, 2));
  return 0;
}
