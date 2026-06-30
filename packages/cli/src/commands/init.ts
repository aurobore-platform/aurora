import {
  applyInitToProject,
  buildInitConfig,
  collectInitDefaults,
  isValidAppId,
  isValidSemver,
} from "@aurobore/build";
import process from "node:process";
import { flagBool, flagString, type ParsedArgs } from "../args.js";
import { createPrompts } from "../prompts.js";
import { readCliVersion } from "../version.js";

function printHelp(): void {
  console.log(`aurobore init — подключить существующий web-проект к Aurobore

Использование: aurobore init [options]

Options:
  -y, --yes              Без вопросов, авто-детект и дефолты
  --force                Перезаписать существующий aurobore.config.json
  --id <appId>           App ID (reverse-DNS)
  --name <displayName>   Отображаемое имя приложения
  --version <semver>     Версия приложения
  --web-root <dir>       Каталог web-сборки (default: dist)
  --entry <file>         Entry HTML (default: index.html)
  --no-internet          Не добавлять разрешение Internet
  --skip-package         Не изменять package.json
  --skip-gitignore       Не изменять .gitignore (по умолчанию добавляется .aurobore/)
`);
}

async function resolveInitInput(
  args: ParsedArgs,
  defaults: ReturnType<typeof collectInitDefaults>,
): Promise<{
  appId: string;
  appName: string;
  version: string;
  webRoot: string;
  webEntry: string;
  internet: boolean;
  confirmed: boolean;
}> {
  const nonInteractive =
    flagBool(args.flags, "y") ||
    flagBool(args.flags, "yes") ||
    flagString(args.flags, "id") != null;

  const flagId = flagString(args.flags, "id");
  const flagName = flagString(args.flags, "name");
  const flagVersion = flagString(args.flags, "version");
  const flagWebRoot = flagString(args.flags, "web-root");
  const flagEntry = flagString(args.flags, "entry");
  const noInternet = flagBool(args.flags, "no-internet");

  if (nonInteractive) {
    return {
      appId: flagId ?? defaults.appId,
      appName: flagName ?? defaults.appName,
      version: flagVersion ?? defaults.version,
      webRoot: flagWebRoot ?? defaults.webRoot,
      webEntry: flagEntry ?? defaults.webEntry,
      internet: noInternet ? false : defaults.internet,
      confirmed: true,
    };
  }

  const prompts = createPrompts();
  try {
    console.log("\nAurobore init — подключение существующего проекта\n");

    let appId = await prompts.askDefault("App ID", defaults.appId);
    while (!isValidAppId(appId)) {
      console.error("  Неверный формат app.id (пример: ru.example.myapp)");
      appId = await prompts.askDefault("App ID", defaults.appId);
    }

    let appName = await prompts.askDefault("Display name", defaults.appName);
    while (appName.trim() === "") {
      appName = await prompts.askDefault("Display name", defaults.appName);
    }

    let version = await prompts.askDefault("Version", defaults.version);
    while (!isValidSemver(version)) {
      console.error("  Неверный semver (пример: 1.0.0)");
      version = await prompts.askDefault("Version", defaults.version);
    }

    const webRoot = await prompts.askDefault(
      `Web root (detected: ${defaults.webRoot})`,
      defaults.webRoot,
    );
    const webEntry = await prompts.askDefault("Entry file", defaults.webEntry);
    const internet = noInternet
      ? false
      : await prompts.confirm("Internet permission?", defaults.internet);

    const preview = buildInitConfig({
      appId,
      appName,
      version,
      webRoot,
      webEntry,
      internet,
    });

    console.log("\nPreview:");
    console.log(JSON.stringify(preview, null, 2));
    console.log("");

    const confirmed = await prompts.confirm("Write files?", true);
    return { appId, appName, version, webRoot, webEntry, internet, confirmed };
  } finally {
    prompts.close();
  }
}

function runScript(packageManager: string, script: string): string {
  return packageManager === "npm" ? `npm run ${script}` : `${packageManager} ${script}`;
}

function printNextSteps(
  packageManager: string,
  hasBuildScript: boolean,
  scriptsAdded: string[],
  cliAdded: boolean,
): void {
  console.log("\nNext steps:");
  if (cliAdded) {
    const installCmd = packageManager === "npm" ? "npm install" : `${packageManager} install`;
    console.log(`  ${installCmd}   # установить @aurobore/cli из devDependencies`);
  }
  if (hasBuildScript && scriptsAdded.includes("build:aurora")) {
    console.log(`  ${runScript(packageManager, "build:aurora")}`);
    console.log(`  ${runScript(packageManager, "aurora:run")}`);
  } else {
    console.log(`  ${runScript(packageManager, "build")}   # ваша web-сборка`);
    console.log(`  ${runScript(packageManager, "aurora:build")}`);
    console.log(`  ${runScript(packageManager, "aurora:run")}`);
  }
}

export async function runInitCommand(args: ParsedArgs): Promise<number> {
  if (flagBool(args.flags, "help") || flagBool(args.flags, "h")) {
    printHelp();
    return 0;
  }

  try {
    const projectRoot = process.cwd();
    const defaults = collectInitDefaults(projectRoot);

    for (const hint of defaults.hints) {
      console.log(`[init] hint: ${hint}`);
    }

    const input = await resolveInitInput(args, defaults);
    if (!input.confirmed) {
      console.log("[init] cancelled");
      return 0;
    }

    const result = applyInitToProject(projectRoot, {
      ...input,
      force: flagBool(args.flags, "force"),
      skipPackage: flagBool(args.flags, "skip-package"),
      skipGitignore: flagBool(args.flags, "skip-gitignore"),
      cliVersion: readCliVersion(),
    });

    if (result.configPath) {
      console.log(`[init] created ${result.configPath}`);
    }
    if (result.cliAdded) {
      console.log(`[init] added @aurobore/cli@^${readCliVersion()} to devDependencies`);
    }
    if (result.packageJsonUpdated) {
      console.log(
        `[init] updated package.json (scripts: ${result.scriptsAdded.join(", ")})`,
      );
    } else if (!flagBool(args.flags, "skip-package")) {
      console.log("[init] package.json unchanged (scripts already present)");
    }
    if (result.gitignoreUpdated) {
      console.log("[init] updated .gitignore");
    }

    printNextSteps(
      defaults.packageManager,
      defaults.hasBuildScript,
      result.scriptsAdded,
      result.cliAdded,
    );
    return 0;
  } catch (err) {
    console.error(`[init] ERROR: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}
