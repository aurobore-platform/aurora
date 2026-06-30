import { buildApp } from "@aurobore/build";
import type { BuildAppOptions } from "@aurobore/build";
import { flagBool, flagString, type ParsedArgs } from "../args.js";

export async function runBuildCommand(args: ParsedArgs): Promise<number> {
  const mode = flagString(args.flags, "mode") === "dev" ? "dev" : "prod";
  const options: BuildAppOptions = {
    mode,
  };

  const target = flagString(args.flags, "target");
  if (target) options.target = target;

  const arch = flagString(args.flags, "arch");
  if (arch === "x86_64" || arch === "armv7hl" || arch === "aarch64") {
    options.arch = arch;
  }

  const staging = flagString(args.flags, "staging");
  if (staging) options.stagingDir = staging;

  if (flagBool(args.flags, "help") || flagBool(args.flags, "h")) {
    console.log(`aurobore build — собрать RPM-пакет приложения

Использование: aurobore build [options]

Options:
  --mode prod|dev     Режим сборки (default: prod)
  --target <name>     SFDK target (override SFDK_TARGET)
  --arch <arch>       x86_64 | armv7hl | aarch64
  --staging <dir>     Каталог staging для sfdk
`);
    return 0;
  }

  try {
    const result = await buildApp(options);
    console.log(`[build] RPM: ${result.rpmPath}`);
    console.log(`[build] app: ${result.appId} v${result.report.version}`);
    console.log(`[build] plugins: ${result.report.plugins.join(", ")}`);
    console.log(`[build] permissions: ${result.report.permissions.join(", ")}`);
    return 0;
  } catch (err) {
    console.error(`[build] ERROR: ${err instanceof Error ? err.message : String(err)}`);
    return 1;
  }
}
