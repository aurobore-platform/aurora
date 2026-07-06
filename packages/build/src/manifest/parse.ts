import type { ManifestValidationError, PluginManifest } from "./types.js";

const MANIFEST_TOP_KEYS = new Set([
  "$schema",
  "manifestVersion",
  "name",
  "display",
  "version",
  "engineCompat",
  "auroraCompat",
  "permissions",
  "scopes",
  "nativeDeps",
  "types",
  "methods",
  "events",
  "errors",
]);

const ENGINE_COMPAT_KEYS = new Set(["runtime", "bridgeProtocol"]);
const AURORA_COMPAT_KEYS = new Set(["minOs", "engines"]);
const NATIVE_DEPS_KEYS = new Set(["rpm", "qt"]);
const METHOD_KEYS = new Set(["args", "result", "stream"]);
const ERROR_CODE_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const ERROR_KEYS = new Set(["message", "description"]);
const PRIMITIVE_TYPES = new Set(["string", "number", "boolean", "object", "array", "void"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function push(errors: ManifestValidationError[], path: string, message: string): void {
  errors.push({ path, message });
}

function validateStringField(
  errors: ManifestValidationError[],
  obj: Record<string, unknown>,
  key: string,
  path: string,
): string | undefined {
  const value = obj[key];
  if (typeof value !== "string" || value.trim() === "") {
    push(errors, path, `${key} must be a non-empty string`);
    return undefined;
  }
  return value;
}

function validateTypeRef(
  errors: ManifestValidationError[],
  value: unknown,
  path: string,
  types: Record<string, Record<string, string>>,
): void {
  if (typeof value !== "string" || value.trim() === "") {
    push(errors, path, "type reference must be a non-empty string");
    return;
  }
  if (!PRIMITIVE_TYPES.has(value) && !(value in types)) {
    push(errors, path, `unknown type reference: ${value}`);
  }
}

function validateMethods(
  errors: ManifestValidationError[],
  methods: unknown,
  types: Record<string, Record<string, string>>,
): void {
  if (!isPlainObject(methods)) {
    push(errors, "methods", "methods must be an object");
    return;
  }
  if (Object.keys(methods).length === 0) {
    push(errors, "methods", "at least one method is required");
  }
  for (const [methodName, rawMethod] of Object.entries(methods)) {
    const base = `methods.${methodName}`;
    if (!isPlainObject(rawMethod)) {
      push(errors, base, "method must be an object");
      continue;
    }
    for (const key of Object.keys(rawMethod)) {
      if (!METHOD_KEYS.has(key)) {
        push(errors, `${base}.${key}`, `unknown field: ${key}`);
      }
    }
    if ("args" in rawMethod) {
      const args = rawMethod.args;
      if (typeof args === "string") {
        validateTypeRef(errors, args, `${base}.args`, types);
      } else if (isPlainObject(args)) {
        for (const [argName, argType] of Object.entries(args)) {
          validateTypeRef(errors, argType, `${base}.args.${argName}`, types);
        }
      } else {
        push(errors, `${base}.args`, "args must be a type reference or object map");
      }
    }
    if ("result" in rawMethod) {
      validateTypeRef(errors, rawMethod.result, `${base}.result`, types);
    }
    if ("stream" in rawMethod && typeof rawMethod.stream !== "boolean") {
      push(errors, `${base}.stream`, "stream must be boolean");
    }
  }
}

function validateTypes(errors: ManifestValidationError[], types: unknown): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  if (types === undefined) return out;
  if (!isPlainObject(types)) {
    push(errors, "types", "types must be an object");
    return out;
  }
  for (const [typeName, fields] of Object.entries(types)) {
    const base = `types.${typeName}`;
    if (!isPlainObject(fields)) {
      push(errors, base, "type must be an object");
      continue;
    }
    const mapped: Record<string, string> = {};
    for (const [fieldName, fieldType] of Object.entries(fields)) {
      if (typeof fieldType !== "string" || fieldType.trim() === "") {
        push(errors, `${base}.${fieldName}`, "field type must be a non-empty string");
        continue;
      }
      const primitive = fieldType.endsWith("?") ? fieldType.slice(0, -1) : fieldType;
      if (!PRIMITIVE_TYPES.has(primitive)) {
        push(errors, `${base}.${fieldName}`, `unsupported primitive: ${fieldType}`);
      }
      mapped[fieldName] = fieldType;
    }
    out[typeName] = mapped;
  }
  return out;
}

function validateErrors(errors: ManifestValidationError[], rawErrors: unknown): void {
  if (rawErrors === undefined) return;
  if (!isPlainObject(rawErrors)) {
    push(errors, "errors", "errors must be an object");
    return;
  }
  for (const [code, entry] of Object.entries(rawErrors)) {
    const base = `errors.${code}`;
    if (!ERROR_CODE_PATTERN.test(code)) {
      push(errors, base, "error code must match ^[A-Z][A-Z0-9_]*$");
    }
    if (!isPlainObject(entry)) {
      push(errors, base, "error entry must be an object");
      continue;
    }
    for (const key of Object.keys(entry)) {
      if (!ERROR_KEYS.has(key)) {
        push(errors, `${base}.${key}`, `unknown field: ${key}`);
      }
    }
    validateStringField(errors, entry, "message", `${base}.message`);
    if ("description" in entry && typeof entry.description !== "string") {
      push(errors, `${base}.description`, "description must be a string");
    }
  }
}

function validateEvents(
  errors: ManifestValidationError[],
  events: unknown,
  types: Record<string, Record<string, string>>,
): void {
  if (events === undefined) return;
  if (!isPlainObject(events)) {
    push(errors, "events", "events must be an object");
    return;
  }
  for (const [eventName, fields] of Object.entries(events)) {
    const base = `events.${eventName}`;
    if (!isPlainObject(fields)) {
      push(errors, base, "event schema must be an object");
      continue;
    }
    for (const [fieldName, fieldType] of Object.entries(fields)) {
      validateTypeRef(errors, fieldType, `${base}.${fieldName}`, types);
    }
  }
}

/** Валидирует сырой JSON манифеста; возвращает список ошибок (пустой = ok). */
export function validateManifest(raw: unknown): ManifestValidationError[] {
  const errors: ManifestValidationError[] = [];
  if (!isPlainObject(raw)) {
    return [{ path: "", message: "manifest must be a JSON object" }];
  }

  for (const key of Object.keys(raw)) {
    if (!MANIFEST_TOP_KEYS.has(key)) {
      push(errors, key, `unknown field: ${key}`);
    }
  }

  const manifestVersion = raw.manifestVersion;
  if (typeof manifestVersion !== "number" || !Number.isInteger(manifestVersion)) {
    push(errors, "manifestVersion", "manifestVersion must be an integer");
  } else if (manifestVersion !== 1) {
    push(errors, "manifestVersion", `unsupported manifestVersion: ${manifestVersion}`);
  }

  validateStringField(errors, raw, "name", "name");
  validateStringField(errors, raw, "display", "display");
  validateStringField(errors, raw, "version", "version");

  if (!isPlainObject(raw.engineCompat)) {
    push(errors, "engineCompat", "engineCompat is required");
  } else {
    for (const key of Object.keys(raw.engineCompat)) {
      if (!ENGINE_COMPAT_KEYS.has(key)) {
        push(errors, `engineCompat.${key}`, `unknown field: ${key}`);
      }
    }
    validateStringField(errors, raw.engineCompat, "runtime", "engineCompat.runtime");
    const bridgeProtocol = raw.engineCompat.bridgeProtocol;
    if (typeof bridgeProtocol !== "number" || !Number.isInteger(bridgeProtocol)) {
      push(errors, "engineCompat.bridgeProtocol", "bridgeProtocol must be an integer");
    }
  }

  if (raw.auroraCompat !== undefined) {
    if (!isPlainObject(raw.auroraCompat)) {
      push(errors, "auroraCompat", "auroraCompat must be an object");
    } else {
      for (const key of Object.keys(raw.auroraCompat)) {
        if (!AURORA_COMPAT_KEYS.has(key)) {
          push(errors, `auroraCompat.${key}`, `unknown field: ${key}`);
        }
      }
    }
  }

  if (raw.permissions !== undefined) {
    if (!Array.isArray(raw.permissions) || raw.permissions.some((p) => typeof p !== "string")) {
      push(errors, "permissions", "permissions must be an array of strings");
    }
  }

  if (raw.scopes !== undefined) {
    if (!Array.isArray(raw.scopes) || raw.scopes.some((p) => typeof p !== "string")) {
      push(errors, "scopes", "scopes must be an array of strings");
    }
  }

  if (raw.nativeDeps !== undefined) {
    if (!isPlainObject(raw.nativeDeps)) {
      push(errors, "nativeDeps", "nativeDeps must be an object");
    } else {
      for (const key of Object.keys(raw.nativeDeps)) {
        if (!NATIVE_DEPS_KEYS.has(key)) {
          push(errors, `nativeDeps.${key}`, `unknown field: ${key}`);
        }
      }
    }
  }

  const types = validateTypes(errors, raw.types);
  validateMethods(errors, raw.methods, types);
  validateEvents(errors, raw.events, types);
  validateErrors(errors, raw.errors);

  return errors;
}

/** Парсит и валидирует манифест; бросает при ошибках. */
export function parseManifest(raw: unknown): PluginManifest {
  const errors = validateManifest(raw);
  if (errors.length > 0) {
    const detail = errors.map((e) => `${e.path}: ${e.message}`).join("; ");
    throw new Error(`Invalid plugin.manifest: ${detail}`);
  }
  return raw as PluginManifest;
}
