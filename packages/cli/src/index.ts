/**
 * @aurobore/cli — программный API CLI (скелет M0).
 *
 * Команды create/dev/build/run/plugin реализуются в M4 (см. docs/architecture/cli.md).
 * В M0 доступна только команда `doctor` (проверка окружения).
 */
export { runDoctor, formatReport } from "./doctor.js";
export type { DoctorReport, DoctorCheck, CheckStatus } from "./doctor.js";
