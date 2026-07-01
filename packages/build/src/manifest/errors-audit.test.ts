import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseManifest } from "./parse.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const PLUGINS_DIR = path.join(REPO_ROOT, "plugins");

const PLUGIN_NAMES = ["echo", "device", "storage", "filesystem", "clipboard", "network"];

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

      expect(manifestCodes).toEqual(nativeCodes);
    });
  }
});
