import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateNativeProject } from "../dist/native/generate.js";
import { loadConfig } from "../dist/config/parse.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const helloRoot = path.join(repoRoot, "examples/hello-world");
const distDir = path.join(helloRoot, "dist");

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
  fs.writeFileSync(path.join(distDir, "index.html"), "<!doctype html><title>hi</title>");
}

const { config } = loadConfig(helloRoot);
const { nativeDir, appId } = await generateNativeProject({
  projectRoot: helloRoot,
  config,
  mode: "prod",
});

for (const size of [86, 108, 128, 172]) {
  const icon = path.join(nativeDir, "icons", `${size}x${size}`, `${appId}.png`);
  if (!fs.existsSync(icon)) {
    console.error(`missing ${icon}`);
    process.exit(1);
  }
}

const spec = fs.readFileSync(path.join(nativeDir, "rpm", `${appId}.spec`), "utf8");
if (!spec.includes("icons/hicolor/172x172")) {
  console.error("spec missing icon paths");
  process.exit(1);
}

console.log(`[verify-icons] OK: ${appId} icons in ${nativeDir}`);
