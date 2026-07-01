import process from "node:process";
import { addPlugin, createPluginScaffold, formatPluginList, listPlugins, removePlugin } from "@aurobore/build";
import { flagBool, flagString, type ParsedArgs } from "../args.js";

export function runPluginCommand(args: ParsedArgs): number {
  const sub = args.positional[0];
  if (flagBool(args.flags, "help") || !sub) {
    console.log(`aurobore plugin add|remove|list|create <name>

  add <name>       Добавить плагин (built-in без npm; --external для npm install)
  remove <name>    Удалить плагин (--keep-npm оставить node_modules)
  list             Список плагинов с версиями и совместимостью
  create <name>    Скелет плагина в ./plugins/<name>/ (--display, --force)`);
    return sub ? 0 : 1;
  }

  const projectRoot = process.cwd();

  try {
    switch (sub) {
      case "list": {
        console.log(formatPluginList(listPlugins(projectRoot)));
        return 0;
      }
      case "create": {
        const name = args.positional[1];
        if (!name) {
          console.error("[plugin] usage: aurobore plugin create <name> [--display \"My Plugin\"] [--force]");
          return 1;
        }
        const result = createPluginScaffold(projectRoot, name, {
          display: flagString(args.flags, "display"),
          force: flagBool(args.flags, "force"),
        });
        console.log(`[plugin] created ${result.pluginDir}`);
        if (result.monorepoPatched) {
          console.log("[plugin] monorepo: updated PLUGIN_NAMES and CMakeLists.txt");
        }
        for (const step of result.nextSteps) {
          console.log(`[plugin] → ${step}`);
        }
        return 0;
      }
      case "add": {
        const name = args.positional[1];
        if (!name) {
          console.error("[plugin] usage: aurobore plugin add <name> [--external]");
          return 1;
        }
        const entry = addPlugin(projectRoot, name, {
          forceExternal: flagBool(args.flags, "external"),
        });
        console.log(
          `[plugin] added ${entry.ref} (${entry.source}) v${entry.version} [${entry.status}]`,
        );
        console.log("[plugin] run `aurobore build` to rebuild RPM");
        return 0;
      }
      case "remove": {
        const name = args.positional[1];
        if (!name) {
          console.error("[plugin] usage: aurobore plugin remove <name> [--keep-npm]");
          return 1;
        }
        removePlugin(projectRoot, name, {
          keepNpm: flagBool(args.flags, "keep-npm"),
        });
        console.log(`[plugin] removed ${name}`);
        console.log("[plugin] run `aurobore build` to rebuild RPM");
        return 0;
      }
      default:
        console.error(`[plugin] неизвестная подкоманда: ${sub}`);
        return 1;
    }
  } catch (err) {
    console.error(`[plugin] ERROR: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}
