/** Поддерживаемые архитектуры таргетов Аврора (см. verification-status.md C-10). */
export type AuroraArch = "x86_64" | "armv7hl" | "aarch64";

export interface NativeProjectSpec {
  appId: string;
  arch: AuroraArch;
}

export function isAuroraArch(value: string): value is AuroraArch {
  return value === "x86_64" || value === "armv7hl" || value === "aarch64";
}
