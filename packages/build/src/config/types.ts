/** Ориентация экрана приложения. */
export type AppOrientation = "portrait" | "landscape" | "auto";

export interface SplashConfig {
  image?: string;
  background?: string;
  timeoutMs?: number;
}

export interface AppConfig {
  id: string;
  name: string;
  version: string;
  orientation?: AppOrientation;
  icon?: string;
  splash?: SplashConfig;
}

export interface DevServerConfig {
  port?: number;
  host?: string;
}

export type PolyfillId =
  | "geolocation"
  | "share"
  | "notification"
  | "clipboard"
  | "mediaDevices";

export type PolyfillsConfig = boolean | PolyfillId[];

export interface WebConfig {
  root: string;
  entry: string;
  entryUrl?: string;
  devServer?: DevServerConfig;
  /** Whitelist external HTTPS origins (origin only, no path). */
  allowedOrigins?: string[];
  /** W3C API polyfills (FR-S6). */
  polyfills?: PolyfillsConfig;
}

export type WebViewEngine = "chromium";

export interface BuildConfig {
  engine?: WebViewEngine;
  minOs?: string;
  targets?: string[];
}

export interface DeepLinksConfig {
  schemes?: string[];
}

export interface CoverActionConfig {
  id: string;
  label: string;
  icon?: string;
}

export interface CoverConfig {
  actions?: CoverActionConfig[];
}

export interface UpdatesConfig {
  enabled?: boolean;
  url?: string;
  channel?: string;
  publicKey?: string;
  checkOnResume?: boolean;
  checkIntervalMs?: number;
}

/** Декларативный конфиг проекта Aurobore (aurobore.config.json). */
export interface AuroboreConfig {
  configVersion: number;
  app: AppConfig;
  web: WebConfig;
  permissions?: string[];
  plugins?: string[];
  build?: BuildConfig;
  deepLinks?: DeepLinksConfig;
  cover?: CoverConfig;
  updates?: UpdatesConfig;
}

/** Агрегированные nativeDeps из манифестов плагинов. */
export interface AggregatedNativeDeps {
  rpm: string[];
  qt: string[];
}

/** Итоговая конфигурация после слияния с манифестами плагинов. */
export interface EffectiveConfig extends AuroboreConfig {
  effectivePermissions: string[];
  nativeDeps: AggregatedNativeDeps;
  resolvedPlugins: string[];
}

export interface ConfigValidationError {
  path: string;
  message: string;
}

export interface LoadedConfig {
  config: AuroboreConfig;
  configPath: string;
}
