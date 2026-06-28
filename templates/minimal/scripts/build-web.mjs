import fs from "node:fs";
import path from "node:path";

const src = path.join("src");
const dist = path.join("dist");

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

if (fs.existsSync(dist)) fs.rmSync(dist, { recursive: true, force: true });
copyDir(src, dist);
console.log("[build:web] copied src/ → dist/");
