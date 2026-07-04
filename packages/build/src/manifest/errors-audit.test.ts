import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseManifest } from "./parse.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const PLUGINS_DIR = path.join(REPO_ROOT, "plugins");

const PLUGIN_NAMES = [
  "echo",
  "device",
  "storage",
  "filesystem",
  "clipboard",
  "network",
  "camera",
  "geolocation",
  "sensors",
  "notifications",
  "share",
];

/** Коды, объявленные в манифесте для будущей UI-итерации (ещё нет QStringLiteral в native). */
function reservedManifestErrorCodes(manifest: { errors?: Record<string, { description?: string }> }): Set<string> {
  const reserved = new Set<string>();
  for (const [code, meta] of Object.entries(manifest.errors ?? {})) {
    const description = meta.description ?? "";
    if (description.includes("Зарезервировано") || description.includes("UI-итераци")) {
      reserved.add(code);
    }
  }
  return reserved;
}

/** Извлекает plugin-specific коды из QStringLiteral("PREFIX_...") в native/*.cpp */
export function extractNativeErrorCodes(cppSource: string, prefix: string): Set<string> {
  const pattern = new RegExp(`QStringLiteral\\("(${prefix}_[A-Z0-9_]+)"\\)`, "g");
  const codes = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(cppSource)) !== null) {
    codes.add(match[1]!);
  }
  return codes;
}

function pluginErrorPrefix(pluginName: string): string {
  return pluginName.replace(/-/g, "_").toUpperCase();
}

function readNativeCpp(pluginName: string, manifest?: { scopes?: string[] }): string {
  const nativeDir = path.join(PLUGINS_DIR, pluginName, "native");
  let source = "";
  if (fs.existsSync(nativeDir)) {
    source = fs
      .readdirSync(nativeDir)
      .filter((f) => f.endsWith(".cpp"))
      .map((f) => fs.readFileSync(path.join(nativeDir, f), "utf8"))
      .join("\n");
  }
  if (manifest?.scopes?.includes("appData")) {
    const scopeValidator = path.join(REPO_ROOT, "runtime/native-sdk/ScopeValidator.cpp");
    if (fs.existsSync(scopeValidator)) {
      source += `\n${fs.readFileSync(scopeValidator, "utf8")}`;
    }
  }
  return source;
}

describe("manifest errors audit", () => {
  for (const pluginName of PLUGIN_NAMES) {
    it(`${pluginName}: manifest.errors совпадает с native QStringLiteral`, () => {
      const manifestPath = path.join(PLUGINS_DIR, pluginName, "plugin.manifest");
      const manifest = parseManifest(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
      const prefix = pluginErrorPrefix(manifest.name);
      const nativeCodes = extractNativeErrorCodes(readNativeCpp(pluginName, manifest), prefix);
      const manifestCodes = new Set(Object.keys(manifest.errors ?? {}));
      const reservedCodes = reservedManifestErrorCodes(manifest);
      const expectedManifestCodes = new Set(
        [...manifestCodes].filter((code) => !reservedCodes.has(code)),
      );

      expect(expectedManifestCodes).toEqual(nativeCodes);
      for (const code of nativeCodes) {
        expect(manifestCodes.has(code)).toBe(true);
      }
    });
  }
});
