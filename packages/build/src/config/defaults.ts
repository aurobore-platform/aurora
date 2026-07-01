import type { AuroboreConfig } from "./types.js";

export const DEFAULT_CONFIG_VERSION = 1;

export const DEFAULT_WEB_ROOT = "dist";
export const DEFAULT_WEB_ENTRY = "index.html";
export const DEFAULT_DEV_SERVER_PORT = 5173;
export const DEFAULT_ORIENTATION = "portrait" as const;
export const DEFAULT_BUILD_ENGINE = "chromium" as const;
export const DEFAULT_MIN_OS = "5.1.5";

/** Применяет значения по умолчанию к частичному конфигу. */
export function applyConfigDefaults(partial: AuroboreConfig): AuroboreConfig {
  return {
    configVersion: partial.configVersion,
    app: {
      orientation: DEFAULT_ORIENTATION,
      ...partial.app,
    },
    web: {
      ...partial.web,
      root: partial.web.root ?? DEFAULT_WEB_ROOT,
      entry: partial.web.entry ?? DEFAULT_WEB_ENTRY,
      devServer: {
        port: DEFAULT_DEV_SERVER_PORT,
        ...partial.web.devServer,
      },
    },
    permissions: partial.permissions ?? [],
    plugins: partial.plugins ?? [],
    build: {
      engine: DEFAULT_BUILD_ENGINE,
      minOs: DEFAULT_MIN_OS,
      ...partial.build,
    },
    deepLinks: partial.deepLinks,
    cover: partial.cover,
  };
}
