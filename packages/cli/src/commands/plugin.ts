import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import {
  loadConfig,
  pluginNameFromRef,
  runProjectCodegenFromConfig,
} from "@aurobore/build";
import { flagBool, type ParsedArgs } from "../args.js";

function readConfigFile(projectRoot: string): Record<string, unknown> {
  const configPath = path.join(projectRoot, "aurobore.config.json");
  return JSON.parse(fs.readFileSync(configPath, "utf8")) as Record<string, unknown>;
}

function writeConfigFile(projectRoot: string, config: Record<string, unknown>): void {
  fs.writeFileSync(
    path.join(projectRoot, "aurobore.config.json"),
    `${JSON.stringify(config, null, 2)}\n`,
    "utf8",
  );
}

function npmRef(name: string): string {
  return name.startsWith("@") ? name : `@aurobore/${name}`;
}

export function runPluginCommand(args: ParsedArgs): number {
  const sub = args.positional[0];
  if (flagBool(args.flags, "help") || !sub) {
    console.log(`aurobore plugin add|remove|list <name>

  add <name>     Добавить плагин в aurobore.config (+ npm install)
  remove <name>  Удалить плагин
  list           Список плагинов`);
    return sub ? 0 : 1;
  }

  const projectRoot = process.cwd();

  try {
    switch (sub) {
      case "list":
        return runPluginList(projectRoot);
      case "add":
        return runPluginAdd(projectRoot, args.positional[1]);
      case "remove":
        return runPluginRemove(projectRoot, args.positional[1]);
      default:
        console.error(`[plugin] неизвестная подкоманда: ${sub}`);
        return 1;
    }
  } catch (err) {
    console.error(`[plugin] ERROR: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}

function runPluginList(projectRoot: string): number {
  const { config } = loadConfig(projectRoot);
  const plugins = config.plugins ?? [];
  if (plugins.length === 0) {
    console.log("[plugin] (none — будет использован echo stub при сборке)");
    return 0;
  }
  for (const ref of plugins) {
    console.log(`  ${ref}`);
  }
  return 0;
}

function runPluginAdd(projectRoot: string, name?: string): number {
  if (!name) {
    console.error("[plugin] usage: aurobore plugin add <name>");
    return 1;
  }
  const ref = npmRef(name);
  const raw = readConfigFile(projectRoot);
  const plugins = (raw.plugins as string[] | undefined) ?? [];
  if (plugins.includes(ref)) {
    console.log(`[plugin] already installed: ${ref}`);
    return 0;
  }

  spawnSync("pnpm", ["add", ref, "--save-prod"], { cwd: projectRoot, stdio: "inherit", shell: true });

  plugins.push(ref);
  raw.plugins = plugins;
  writeConfigFile(projectRoot, raw);

  runProjectCodegenFromConfig(projectRoot, plugins);
  console.log(`[plugin] added ${ref} — run aurobore build to rebuild native project`);
  return 0;
}

function runPluginRemove(projectRoot: string, name?: string): number {
  if (!name) {
    console.error("[plugin] usage: aurobore plugin remove <name>");
    return 1;
  }
  const ref = npmRef(name);
  const short = pluginNameFromRef(ref);
  const raw = readConfigFile(projectRoot);
  const plugins = ((raw.plugins as string[]) ?? []).filter((p) => pluginNameFromRef(p) !== short);
  raw.plugins = plugins;
  writeConfigFile(projectRoot, raw);

  spawnSync("pnpm", ["remove", ref], { cwd: projectRoot, stdio: "inherit", shell: true });

  if (plugins.length > 0) {
    runProjectCodegenFromConfig(projectRoot, plugins);
  }
  console.log(`[plugin] removed ${ref}`);
  return 0;
}
