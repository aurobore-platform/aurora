/**
 * @aurobore/cli — программный API CLI (M4).
 */
export { runDoctor, formatReport } from "./doctor.js";
export type { DoctorReport, DoctorCheck, CheckStatus } from "./doctor-types.js";
export { parseArgs } from "./args.js";
export { runBuildCommand } from "./commands/build.js";
export { runRunCommand } from "./commands/run.js";
export { runConfigCommand } from "./commands/config.js";
export { runCreateCommand } from "./commands/create.js";
export { runDevCommand } from "./commands/dev.js";
export { runPluginCommand } from "./commands/plugin.js";
export { runGenerateCommand, runCleanCommand } from "./commands/clean.js";
export { runInfoCommand } from "./commands/info.js";
