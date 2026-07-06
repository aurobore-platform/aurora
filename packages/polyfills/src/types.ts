export const POLYFILL_IDS = [
  "geolocation",
  "share",
  "notification",
  "clipboard",
  "mediaDevices",
] as const;

export type PolyfillId = (typeof POLYFILL_IDS)[number];

/**
 * Дефолтный набор при `web.polyfills: true` — «лёгкие» invoke-адаптеры.
 * `mediaDevices` (getUserMedia) исключён: engine-first, только явный opt-in;
 * Camera-fallback заблокирован на device-спайк (см. ADR-011).
 */
export const DEFAULT_POLYFILL_IDS = [
  "geolocation",
  "share",
  "notification",
  "clipboard",
] as const;

export type PolyfillsConfig = boolean | PolyfillId[];

export interface InstallPolyfillsOptions {
  only?: PolyfillId[];
  /** Ждать window.Aurobore перед патчем (default true). */
  waitForBridge?: boolean;
}

export interface PluginPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export interface CameraFramePayload {
  kind: "frame";
  format: "jpeg" | "rgba";
  width: number;
  height: number;
  timestamp: number;
  binaryPayload: string;
}
