import process from "node:process";
import { loadAuroraEnv, findMonorepoRoot } from "@aurobore/build";
import { flagBool, type ParsedArgs } from "../args.js";
import { readCliVersion } from "../version.js";

export function runInfoCommand(args: ParsedArgs): number {
  if (flagBool(args.flags, "help")) {
    console.log("aurobore info — версии и окружение");
    return 0;
  }

  const cliVersion = readCliVersion();

  const env = loadAuroraEnv({ projectRoot: process.cwd() });
  const monorepo = findMonorepoRoot(process.cwd());

  console.log(`Aurobore CLI:     ${cliVersion}`);
  console.log(`Node:             ${process.version}`);
  console.log(`Platform:         ${process.platform}`);
  console.log(`SFDK target:      ${env.SFDK_TARGET}`);
  console.log(`Monorepo:         ${monorepo ?? "(none)"}`);
  return 0;
}
