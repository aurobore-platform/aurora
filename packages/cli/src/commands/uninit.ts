import { collectInitDefaults, removeInitFromProject } from "@aurobore/build";
import process from "node:process";
import { flagBool, type ParsedArgs } from "../args.js";
import { createPrompts } from "../prompts.js";

function printHelp(): void {
  console.log(`aurobore uninit — откатить aurobore init из проекта

Использование: aurobore uninit [options]

Удаляет aurobore.config.json, скрипты aurora:* (если совпадают с init),
@aurobore/cli из devDependencies, строку .aurobore/ в .gitignore и каталог .aurobore/.

Options:
  -y, --yes              Без подтверждения
  --skip-package         Не изменять package.json
  --skip-gitignore       Не изменять .gitignore
  --keep-cache           Не удалять .aurobore/
`);
}

export async function runUninitCommand(args: ParsedArgs): Promise<number> {
  if (flagBool(args.flags, "help") || flagBool(args.flags, "h")) {
    printHelp();
    return 0;
  }

  const projectRoot = process.cwd();
  const defaults = collectInitDefaults(projectRoot);
  const nonInteractive = flagBool(args.flags, "y") || flagBool(args.flags, "yes");

  if (!nonInteractive) {
    const prompts = createPrompts();
    try {
      console.log("\nAurobore uninit — откат init\n");
      const confirmed = await prompts.confirm(
        "Удалить aurobore.config, скрипты aurora:* и @aurobore/cli?",
        false,
      );
      if (!confirmed) {
        console.log("[uninit] cancelled");
        return 0;
      }
    } finally {
      prompts.close();
    }
  }

  try {
    const result = removeInitFromProject(projectRoot, {
      skipPackage: flagBool(args.flags, "skip-package"),
      skipGitignore: flagBool(args.flags, "skip-gitignore"),
      keepCache: flagBool(args.flags, "keep-cache"),
    });

    if (result.configRemoved) {
      console.log(`[uninit] removed ${result.configRemoved}`);
    } else {
      console.log("[uninit] aurobore.config not found");
    }

    if (result.cliRemoved) {
      console.log("[uninit] removed @aurobore/cli from devDependencies");
    }

    if (result.packageJsonUpdated) {
      const parts = [...result.scriptsRemoved];
      if (result.cliRemoved && parts.length === 0) {
        console.log("[uninit] updated package.json");
      } else if (parts.length > 0) {
        console.log(`[uninit] updated package.json (removed scripts: ${parts.join(", ")})`);
      }
    } else if (!flagBool(args.flags, "skip-package")) {
      console.log("[uninit] package.json unchanged");
    }

    if (result.gitignoreUpdated) {
      console.log("[uninit] removed .aurobore/ from .gitignore");
    }

    if (result.cacheRemoved) {
      console.log("[uninit] removed .aurobore/");
    } else if (!flagBool(args.flags, "keep-cache")) {
      console.log("[uninit] no .aurobore/ cache to remove");
    }

    if (result.cliRemoved) {
      const installCmd =
        defaults.packageManager === "npm"
          ? "npm install"
          : `${defaults.packageManager} install`;
      console.log(`\nNext step: ${installCmd}   # обновить lockfile после удаления CLI`);
    }

    return 0;
  } catch (err) {
    console.error(`[uninit] ERROR: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}
