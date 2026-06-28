#!/usr/bin/env node
import process from "node:process";
import { parseArgs } from "./args.js";
import { runBuildCommand } from "./commands/build.js";
import { runConfigCommand } from "./commands/config.js";
import { runRunCommand } from "./commands/run.js";
import { runCreateCommand } from "./commands/create.js";
import { runDevCommand } from "./commands/dev.js";
import { runPluginCommand } from "./commands/plugin.js";
import { runGenerateCommand, runCleanCommand } from "./commands/clean.js";
import { runInfoCommand } from "./commands/info.js";
import { formatReport, runDoctor } from "./doctor.js";

const COMMANDS = [
  "create",
  "dev",
  "build",
  "run",
  "doctor",
  "plugin",
  "config",
  "generate",
  "clean",
  "info",
] as const;

function printUsage(): void {
  console.log(
    [
      "aurobore — CLI Aurobore (M4)",
      "",
      "Использование: aurobore <команда> [options]",
      "",
      "Команды:",
      "  create <name>     Создать проект из шаблона",
      "  dev               Dev server + live reload",
      "  build             Собрать RPM-пакет",
      "  run               Установить и запустить на эмуляторе",
      "  doctor            Диагностика окружения",
      "  plugin add|remove|list  Управление плагинами",
      "  config [validate] Показать/валидировать конфиг",
      "  generate          Перегенерировать кодоген плагинов",
      "  clean             Удалить .aurobore/",
      "  info              Версии и окружение",
    ].join("\n"),
  );
}

async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const command = argv[0];
  const rest = parseArgs(argv.slice(1));

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  let exitCode = 0;

  switch (command) {
    case "doctor": {
      const report = runDoctor();
      console.log(formatReport(report));
      exitCode = report.ok ? 0 : 1;
      break;
    }
    case "build":
      exitCode = runBuildCommand(rest);
      break;
    case "run":
      exitCode = await runRunCommand(rest);
      break;
    case "config":
      exitCode = runConfigCommand(rest);
      break;
    case "create":
      exitCode = runCreateCommand(rest);
      break;
    case "dev":
      exitCode = await runDevCommand(rest);
      break;
    case "plugin":
      exitCode = runPluginCommand(rest);
      break;
    case "generate":
    case "codegen":
      exitCode = runGenerateCommand(rest);
      break;
    case "clean":
      exitCode = runCleanCommand(rest);
      break;
    case "info":
      exitCode = runInfoCommand(rest);
      break;
    default:
      console.error(`Неизвестная команда: ${command}`);
      console.error(`Доступные команды: ${COMMANDS.join(", ")}`);
      exitCode = 1;
  }

  process.exitCode = exitCode;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
