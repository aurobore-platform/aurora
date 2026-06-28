import { runApp } from "@aurobore/build";
import { flagBool, flagString, type ParsedArgs } from "../args.js";

export async function runRunCommand(args: ParsedArgs): Promise<number> {
  if (flagBool(args.flags, "help") || flagBool(args.flags, "h")) {
    console.log(`aurobore run — установить и запустить на эмуляторе

Использование: aurobore run [options]

Options:
  --rpm <path>        Путь к RPM (default: last build)
  --staging <dir>     Каталог staging
`);
    return 0;
  }

  try {
    const rpm = flagString(args.flags, "rpm");
    const staging = flagString(args.flags, "staging");
    await runApp({
      rpmPath: rpm,
      stagingDir: staging,
    });
    console.log("[run] приложение запущено на эмуляторе");
    return 0;
  } catch (err) {
    console.error(`[run] ERROR: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}
