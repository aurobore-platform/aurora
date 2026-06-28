#!/usr/bin/env node
/**
 * create-aurobore — делегирует в aurobore create (M4).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(__dirname, "../../cli/dist/cli.js");

export function main(argv: string[] = process.argv.slice(2)): void {
  const target = argv[0] ?? ".";
  const res = spawnSync(process.execPath, [cliPath, "create", target, ...argv.slice(1)], {
    stdio: "inherit",
  });
  process.exit(res.status ?? 1);
}

main();
