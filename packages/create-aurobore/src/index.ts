#!/usr/bin/env node
/**
 * create-aurobore — генератор проектов (скелет M0).
 *
 * Полная реализация (копирование шаблона из templates/, заполнение aurobore.config) — в M5.
 */

export function main(argv: string[] = process.argv.slice(2)): void {
  const target = argv[0] ?? ".";
  console.log(
    `create-aurobore (скелет M0): создание проекта в "${target}" будет реализовано в M5.`,
  );
}

main();
