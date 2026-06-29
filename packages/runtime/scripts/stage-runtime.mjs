import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, "..");
const REPO_RUNTIME = path.resolve(PKG_ROOT, "../../runtime");

const RUNTIME_DIRS = ["container", "bridge-native", "native-sdk"];
const EXCLUDE_DIRS = new Set(["RPMS", "CMakeFiles", ".sfdk", "generated", "node_modules"]);

function copyDirFiltered(src, dst, excludeDirs) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (excludeDirs.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirFiltered(srcPath, dstPath, excludeDirs);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function stageRuntime() {
  for (const dir of RUNTIME_DIRS) {
    const src = path.join(REPO_RUNTIME, dir);
    const dst = path.join(PKG_ROOT, dir);
    if (!fs.existsSync(src)) {
      throw new Error(`runtime source not found: ${src}`);
    }
    if (fs.existsSync(dst)) {
      fs.rmSync(dst, { recursive: true, force: true });
    }
    copyDirFiltered(src, dst, EXCLUDE_DIRS);
  }
}

stageRuntime();
console.log("[@aurobore/runtime] staged container, bridge-native, native-sdk");
