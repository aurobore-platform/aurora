import fs from "node:fs";
import path from "node:path";
import { copyTemplate, resolveTemplateDir } from "@aurobore/build";
import { flagBool, flagString, type ParsedArgs } from "../args.js";

export function runCreateCommand(args: ParsedArgs): number {
  const name = args.positional[0];
  if (flagBool(args.flags, "help") || !name) {
    console.log(`aurobore create <name> [--dir .] [--template vanilla|minimal]

Создаёт проект из шаблона templates/vanilla (по умолчанию) или templates/minimal.`);
    return name ? 0 : 1;
  }

  const targetDir = path.resolve(flagString(args.flags, "dir") ?? name);
  const template = flagString(args.flags, "template") ?? "vanilla";

  if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
    console.error(`[create] каталог не пуст: ${targetDir}`);
    return 1;
  }

  try {
    const templateDir = resolveTemplateDir(template);
    copyTemplate(templateDir, targetDir, { APP_NAME: name });
    console.log(`[create] проект "${name}" создан в ${targetDir}`);
    console.log(`[create] следующий шаг: cd ${path.basename(targetDir)} && pnpm build:web && aurobore build`);
    return 0;
  } catch (err) {
    console.error(`[create] ERROR: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}
