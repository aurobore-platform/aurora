#!/usr/bin/env node
import process from "node:process";
import { formatReport, runDoctor } from "./doctor.js";

const COMMANDS = ["doctor"] as const;

function printUsage(): void {
  console.log(
    [
      "aurobore — CLI Aurobore (M0)",
      "",
      "Использование: aurobore <команда>",
      "",
      "Команды:",
      "  doctor    Проверить окружение разработчика (Node, pnpm, Aurora SDK)",
      "",
      "Команды create/dev/build/run/plugin будут добавлены в M4.",
    ].join("\n"),
  );
}

function main(argv: string[] = process.argv.slice(2)): void {
  const command = argv[0];

  if (!command || command === "--help" || command === "-h") {
    printUsage();
    return;
  }

  switch (command) {
    case "doctor": {
      const report = runDoctor();
      console.log(formatReport(report));
      process.exitCode = report.ok ? 0 : 1;
      return;
    }
    default: {
      console.error(`Неизвестная команда: ${command}`);
      console.error(`Доступные команды: ${COMMANDS.join(", ")}`);
      process.exitCode = 1;
    }
  }
}

main();
