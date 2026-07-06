import type { AuroboreConfig, PolyfillsConfig } from "../config/types.js";

/** Включены ли W3C polyfills в конфиге проекта. */
export function isPolyfillsEnabled(config: AuroboreConfig): boolean {
  const p = config.web.polyfills;
  if (p === true) return true;
  if (Array.isArray(p) && p.length > 0) return true;
  return false;
}

/**
 * Дефолтный набор при `web.polyfills: true` — «лёгкие» invoke-адаптеры.
 * `mediaDevices` (getUserMedia) исключён: engine-first, только явный opt-in
 * (`web.polyfills: [..., "mediaDevices"]`); см. ADR-011.
 */
export const DEFAULT_POLYFILL_IDS = [
  "geolocation",
  "share",
  "notification",
  "clipboard",
] as const;

/** Нормализует polyfills config в список id или null если выключено. */
export function resolvePolyfillIds(config: AuroboreConfig): string[] | null {
  const p: PolyfillsConfig | undefined = config.web.polyfills;
  if (p === true) {
    return [...DEFAULT_POLYFILL_IDS];
  }
  if (Array.isArray(p) && p.length > 0) return [...p];
  return null;
}
