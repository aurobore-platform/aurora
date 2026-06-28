import process from "node:process";
import { addPlugin, formatPluginList, listPlugins, removePlugin } from "@aurobore/build";
import { flagBool, type ParsedArgs } from "../args.js";

export function runPluginCommand(args: ParsedArgs): number {
  const sub = args.positional[0];
  if (flagBool(args.flags, "help") || !sub) {
    console.log(`aurobore plugin add|remove|list <name>

  add <name>       Добавить плагин (built-in без npm; --external для npm install)
  remove <name>    Удалить плагин (--keep-npm оставить node_modules)
  list             Список плагинов с версиями и совместимостью`);
    return sub ? 0 : 1;
  }

  const projectRoot = process.cwd();

  try {
    switch (sub) {
      case "list": {
        console.log(formatPluginList(listPlugins(projectRoot)));
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
