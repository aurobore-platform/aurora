import fs from "node:fs";
import path from "node:path";
import { applyConfigDefaults } from "./defaults.js";
import type { AuroboreConfig, ConfigValidationError, LoadedConfig } from "./types.js";

const CONFIG_FILENAMES = ["aurobore.config.json", "aurobore.config.js"] as const;

const TOP_KEYS = new Set([
  "$schema",
  "configVersion",
  "app",
  "web",
  "permissions",
  "plugins",
  "build",
  "deepLinks",
  "cover",
  "updates",
]);

const APP_KEYS = new Set(["id", "name", "version", "orientation", "icon", "iconMode", "splash"]);
const WEB_KEYS = new Set(["root", "entry", "entryUrl", "devServer", "allowedOrigins", "polyfills"]);
const SPLASH_KEYS = new Set(["image", "background", "gradientStart", "gradientEnd", "showName", "timeoutMs"]);
const DEV_SERVER_KEYS = new Set(["port", "host"]);
const BUILD_KEYS = new Set(["engine", "minOs", "targets"]);
const DEEP_LINKS_KEYS = new Set(["schemes"]);
const COVER_KEYS = new Set(["mode", "actions"]);
const POLYFILL_IDS = new Set([
  "geolocation",
  "share",
  "notification",
  "clipboard",
  "mediaDevices",
]);
const COVER_ACTION_KEYS = new Set(["id", "label", "icon"]);
const UPDATES_KEYS = new Set([
  "enabled",
  "url",
  "channel",
  "publicKey",
  "checkOnResume",
  "checkIntervalMs",
]);

const ORIENTATIONS = new Set(["portrait", "landscape", "auto"]);
const ENGINES = new Set(["chromium"]);

const APP_ID_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(-[\w.-]+)?(\+[\w.-]+)?$/;
const COVER_ACTION_ID_RE = /^[a-z][a-z0-9_-]*$/i;
const ALLOWED_ORIGIN_RE = /^https:\/\/[^/]+/;
const UPDATES_URL_RE = /^https?:\/\/[^/]+/;
const MAX_COVER_ACTIONS = 4;
const ICON_MODES = new Set(["Scale", "Crop"]);
const COVER_MODES = new Set(["template", "preview"]);
const HEX_COLOR_RE = /^#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

function validateHexColor(
  errors: ConfigValidationError[],
  value: unknown,
  path: string,
): void {
  if (value === undefined) {
    return;
  }
  if (typeof value !== "string" || !HEX_COLOR_RE.test(value)) {
    push(errors, path, "must be a hex color (#RRGGBB or #AARRGGBB)");
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function push(errors: ConfigValidationError[], configPath: string, message: string): void {
  errors.push({ path: configPath, message });
}

function validateStringField(
  errors: ConfigValidationError[],
  obj: Record<string, unknown>,
  key: string,
  configPath: string,
): string | undefined {
  const value = obj[key];
  if (typeof value !== "string" || value.trim() === "") {
    push(errors, configPath, `${key} must be a non-empty string`);
    return undefined;
  }
  return value;
}

function validateStringArray(
  errors: ConfigValidationError[],
  value: unknown,
  configPath: string,
): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    push(errors, configPath, "must be an array of strings");
    return undefined;
  }
  return value;
}

function validateAllowedOrigins(
  errors: ConfigValidationError[],
  value: unknown,
): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) {
    push(errors, "web.allowedOrigins", "must be an array of strings");
    return undefined;
  }
  const seen = new Set<string>();
  const origins: string[] = [];
  value.forEach((item, index) => {
    const path = `web.allowedOrigins[${index}]`;
    if (typeof item !== "string") {
      push(errors, path, "must be a string");
      return;
    }
    if (!ALLOWED_ORIGIN_RE.test(item)) {
      push(errors, path, "must be an HTTPS origin without path (e.g. https://example.com)");
      return;
    }
    if (seen.has(item)) {
      push(errors, path, `duplicate origin: ${item}`);
      return;
    }
    seen.add(item);
    origins.push(item);
  });
  return origins;
}

function validateInternetForUpdates(
  errors: ConfigValidationError[],
  updates: Record<string, unknown> | undefined,
  permissions: unknown,
): void {
  if (!updates || updates.enabled !== true) return;
  const perms = Array.isArray(permissions) ? permissions : [];
  if (!perms.includes("Internet")) {
    push(errors, "updates", "updates.enabled requires Internet in permissions");
  }
}

function validateUpdates(
  errors: ConfigValidationError[],
  value: unknown,
  permissions: unknown,
): void {
  if (value === undefined) return;
  if (!isPlainObject(value)) {
    push(errors, "updates", "updates must be an object");
    return;
  }
  for (const key of Object.keys(value)) {
    if (!UPDATES_KEYS.has(key)) {
      push(errors, `updates.${key}`, `unknown field: ${key}`);
    }
  }
  if (value.enabled === true) {
    const url = value.url;
    if (typeof url !== "string" || !UPDATES_URL_RE.test(url)) {
      push(errors, "updates.url", "url must be an HTTP(S) origin base when enabled");
    }
    const publicKey = value.publicKey;
    if (typeof publicKey !== "string" || publicKey.trim() === "") {
      push(errors, "updates.publicKey", "publicKey is required when enabled");
    }
    if (value.channel !== undefined && (typeof value.channel !== "string" || value.channel.trim() === "")) {
      push(errors, "updates.channel", "channel must be a non-empty string");
    }
    if (
      value.checkIntervalMs !== undefined &&
      (typeof value.checkIntervalMs !== "number" || value.checkIntervalMs < 60000)
    ) {
      push(errors, "updates.checkIntervalMs", "checkIntervalMs must be >= 60000");
    }
  }
  validateInternetForUpdates(errors, value, permissions);
}

function validateInternetForAllowedOrigins(
  errors: ConfigValidationError[],
  allowedOrigins: string[] | undefined,
  permissions: unknown,
): void {
  if (!allowedOrigins || allowedOrigins.length === 0) return;
  const perms = Array.isArray(permissions) ? permissions : [];
  if (!perms.includes("Internet")) {
    push(
      errors,
      "web.allowedOrigins",
      "non-empty allowedOrigins requires Internet in permissions",
    );
  }
}

/** Валидирует сырой JSON конфига; возвращает список ошибок (пустой = ok). */
export function validateConfig(raw: unknown): ConfigValidationError[] {
  const errors: ConfigValidationError[] = [];
  if (!isPlainObject(raw)) {
    return [{ path: "", message: "config must be a JSON object" }];
  }

  for (const key of Object.keys(raw)) {
    if (!TOP_KEYS.has(key)) {
      push(errors, key, `unknown field: ${key}`);
    }
  }

  const configVersion = raw.configVersion;
  if (typeof configVersion !== "number" || !Number.isInteger(configVersion)) {
    push(errors, "configVersion", "configVersion must be an integer");
  } else if (configVersion !== 1) {
    push(errors, "configVersion", `unsupported configVersion: ${configVersion}`);
  }

  if (!isPlainObject(raw.app)) {
    push(errors, "app", "app is required");
  } else {
    for (const key of Object.keys(raw.app)) {
      if (!APP_KEYS.has(key)) {
        push(errors, `app.${key}`, `unknown field: ${key}`);
      }
    }
    const appId = validateStringField(errors, raw.app, "id", "app.id");
    if (appId && !APP_ID_RE.test(appId)) {
      push(errors, "app.id", "app.id must be a reverse-domain identifier (e.g. ru.example.app)");
    }
    validateStringField(errors, raw.app, "name", "app.name");
    const version = validateStringField(errors, raw.app, "version", "app.version");
    if (version && !SEMVER_RE.test(version)) {
      push(errors, "app.version", "app.version must be semver (e.g. 1.0.0)");
    }
    if (raw.app.orientation !== undefined) {
      if (typeof raw.app.orientation !== "string" || !ORIENTATIONS.has(raw.app.orientation)) {
        push(errors, "app.orientation", "orientation must be portrait, landscape, or auto");
      }
    }
    if (raw.app.iconMode !== undefined) {
      if (typeof raw.app.iconMode !== "string" || !ICON_MODES.has(raw.app.iconMode)) {
        push(errors, "app.iconMode", "iconMode must be Scale or Crop");
      }
    }
    if (raw.app.splash !== undefined) {
      if (!isPlainObject(raw.app.splash)) {
        push(errors, "app.splash", "splash must be an object");
      } else {
        for (const key of Object.keys(raw.app.splash)) {
          if (!SPLASH_KEYS.has(key)) {
            push(errors, `app.splash.${key}`, `unknown field: ${key}`);
          }
        }
        validateHexColor(errors, raw.app.splash.background, "app.splash.background");
        validateHexColor(errors, raw.app.splash.gradientStart, "app.splash.gradientStart");
        validateHexColor(errors, raw.app.splash.gradientEnd, "app.splash.gradientEnd");
        if (
          raw.app.splash.showName !== undefined &&
          typeof raw.app.splash.showName !== "boolean"
        ) {
          push(errors, "app.splash.showName", "showName must be a boolean");
        }
        if (
          raw.app.splash.timeoutMs !== undefined &&
          (typeof raw.app.splash.timeoutMs !== "number" || raw.app.splash.timeoutMs < 0)
        ) {
          push(errors, "app.splash.timeoutMs", "timeoutMs must be a non-negative number");
        }
      }
    }
  }

  if (!isPlainObject(raw.web)) {
    push(errors, "web", "web is required");
  } else {
    for (const key of Object.keys(raw.web)) {
      if (!WEB_KEYS.has(key)) {
        push(errors, `web.${key}`, `unknown field: ${key}`);
      }
    }
    validateStringField(errors, raw.web, "root", "web.root");
    validateStringField(errors, raw.web, "entry", "web.entry");
    if (raw.web.devServer !== undefined) {
      if (!isPlainObject(raw.web.devServer)) {
        push(errors, "web.devServer", "devServer must be an object");
      } else {
        for (const key of Object.keys(raw.web.devServer)) {
          if (!DEV_SERVER_KEYS.has(key)) {
            push(errors, `web.devServer.${key}`, `unknown field: ${key}`);
          }
        }
        if (
          raw.web.devServer.port !== undefined &&
          (typeof raw.web.devServer.port !== "number" ||
            raw.web.devServer.port < 1 ||
            raw.web.devServer.port > 65535)
        ) {
          push(errors, "web.devServer.port", "port must be an integer between 1 and 65535");
        }
      }
    }
    const allowedOrigins = validateAllowedOrigins(errors, raw.web.allowedOrigins);
    validateInternetForAllowedOrigins(errors, allowedOrigins, raw.permissions);
    if (raw.web.polyfills !== undefined) {
      if (raw.web.polyfills === true) {
        // ok
      } else if (Array.isArray(raw.web.polyfills)) {
        for (let i = 0; i < raw.web.polyfills.length; i++) {
          const id = raw.web.polyfills[i];
          if (typeof id !== "string" || !POLYFILL_IDS.has(id)) {
            push(errors, `web.polyfills[${i}]`, `unknown polyfill id: ${String(id)}`);
          }
        }
      } else {
        push(errors, "web.polyfills", "polyfills must be true or an array of polyfill ids");
      }
    }
  }

  validateStringArray(errors, raw.permissions, "permissions");
  validateStringArray(errors, raw.plugins, "plugins");

  if (raw.build !== undefined) {
    if (!isPlainObject(raw.build)) {
      push(errors, "build", "build must be an object");
    } else {
      for (const key of Object.keys(raw.build)) {
        if (!BUILD_KEYS.has(key)) {
          push(errors, `build.${key}`, `unknown field: ${key}`);
        }
      }
      if (raw.build.engine !== undefined) {
        if (typeof raw.build.engine !== "string" || !ENGINES.has(raw.build.engine)) {
          push(errors, "build.engine", "engine must be chromium");
        }
      }
      validateStringArray(errors, raw.build.targets, "build.targets");
    }
  }

  if (raw.deepLinks !== undefined) {
    if (!isPlainObject(raw.deepLinks)) {
      push(errors, "deepLinks", "deepLinks must be an object");
    } else {
      for (const key of Object.keys(raw.deepLinks)) {
        if (!DEEP_LINKS_KEYS.has(key)) {
          push(errors, `deepLinks.${key}`, `unknown field: ${key}`);
        }
      }
      validateStringArray(errors, raw.deepLinks.schemes, "deepLinks.schemes");
    }
  }

  if (raw.cover !== undefined) {
    if (!isPlainObject(raw.cover)) {
      push(errors, "cover", "cover must be an object");
    } else {
      for (const key of Object.keys(raw.cover)) {
        if (!COVER_KEYS.has(key)) {
          push(errors, `cover.${key}`, `unknown field: ${key}`);
        }
      }
      if (raw.cover.mode !== undefined) {
        if (typeof raw.cover.mode !== "string" || !COVER_MODES.has(raw.cover.mode)) {
          push(errors, "cover.mode", "mode must be template or preview");
        }
      }
      if (raw.cover.actions !== undefined) {
        if (!Array.isArray(raw.cover.actions)) {
          push(errors, "cover.actions", "actions must be an array");
        } else if (raw.cover.actions.length > MAX_COVER_ACTIONS) {
          push(errors, "cover.actions", `actions must contain at most ${MAX_COVER_ACTIONS} items`);
        } else {
          const seenIds = new Set<string>();
          raw.cover.actions.forEach((item, index) => {
            const path = `cover.actions[${index}]`;
            if (!isPlainObject(item)) {
              push(errors, path, "action must be an object");
              return;
            }
            for (const key of Object.keys(item)) {
              if (!COVER_ACTION_KEYS.has(key)) {
                push(errors, `${path}.${key}`, `unknown field: ${key}`);
              }
            }
            const id = validateStringField(errors, item, "id", `${path}.id`);
            const label = validateStringField(errors, item, "label", `${path}.label`);
            if (id && !COVER_ACTION_ID_RE.test(id)) {
              push(errors, `${path}.id`, "id must be alphanumeric with _ or -");
            }
            if (id && seenIds.has(id)) {
              push(errors, `${path}.id`, `duplicate action id: ${id}`);
            } else if (id) {
              seenIds.add(id);
            }
            if (label === undefined && item.label !== undefined) {
              push(errors, `${path}.label`, "label must be a non-empty string");
            }
            if (item.icon !== undefined && (typeof item.icon !== "string" || item.icon.trim() === "")) {
              push(errors, `${path}.icon`, "icon must be a non-empty string");
            }
          });
        }
      }
    }
  }

  validateUpdates(errors, raw.updates, raw.permissions);

  return errors;
}

/** Парсит и валидирует конфиг; бросает при ошибках. */
export function parseConfig(raw: unknown): AuroboreConfig {
  const errors = validateConfig(raw);
  if (errors.length > 0) {
    const detail = errors.map((e) => `${e.path}: ${e.message}`).join("; ");
    throw new Error(`Invalid aurobore.config: ${detail}`);
  }
  return applyConfigDefaults(raw as AuroboreConfig);
}

/** Ищет файл конфигурации в каталоге проекта. */
export function findConfigFile(projectRoot: string): string | null {
  for (const name of CONFIG_FILENAMES) {
    const candidate = path.join(projectRoot, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/** Загружает конфиг из каталога проекта. */
export function loadConfig(projectRoot: string): LoadedConfig {
  const configPath = findConfigFile(projectRoot);
  if (!configPath) {
    throw new Error(
      `aurobore.config not found in ${projectRoot} (expected aurobore.config.json)`,
    );
  }

  let raw: unknown;
  if (configPath.endsWith(".json")) {
    raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } else {
    throw new Error(`Dynamic config (${path.basename(configPath)}) is not supported yet`);
  }

  return { config: parseConfig(raw), configPath };
}

/** Проверяет формат app.id (reverse-DNS). */
export function isValidAppId(id: string): boolean {
  return APP_ID_RE.test(id);
}

/** Проверяет semver app.version. */
export function isValidSemver(version: string): boolean {
  return SEMVER_RE.test(version);
}
