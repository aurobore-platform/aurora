import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateJsWrapper, generateTypes } from "../dist/codegen/generate.js";
import { runProjectCodegen, findMonorepoRoot } from "../dist/codegen/project.js";
import { parseManifest } from "../dist/manifest/parse.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = findMonorepoRoot(path.join(__dirname, "..")) ?? path.resolve(__dirname, "../../..");

/** Плагины MVP + Echo + расширение A3 (порядок регистрации). */
const PLUGIN_NAMES = [
  "echo",
  "device",
  "storage",
  "filesystem",
  "clipboard",
  "network",
  "camera",
  "geolocation",
  "notifications",
  "share",
  "sensors",
];

function readManifest(pluginName) {
  const manifestPath = path.join(REPO_ROOT, "plugins", pluginName, "plugin.manifest");
  return parseManifest(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
}

function writePluginWrappers(manifests) {
  for (const manifest of manifests) {
    const outDir = path.join(REPO_ROOT, "plugins", manifest.name, "generated");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "index.js"), generateJsWrapper(manifest), "utf8");
    fs.writeFileSync(path.join(outDir, "index.d.ts"), generateTypes(manifest), "utf8");
  }
}

const { manifests } = runProjectCodegen({
  projectRoot: REPO_ROOT,
  pluginNames: PLUGIN_NAMES,
  resolveManifest: readManifest,
  nativeOutDir: path.join(REPO_ROOT, "runtime", "container", "generated"),
  pluginsBundlePath: path.join(REPO_ROOT, "runtime", "container", "html", "js", "aurobore-plugins.js"),
});

writePluginWrappers(manifests);

console.log(`[codegen] ${manifests.length} plugins processed`);
