import { bundleVanillaWebApp } from "@aurobore/build";
import { injectPolyfillsScript } from "@aurobore/build";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
await bundleVanillaWebApp(root);

const indexPath = path.join(root, "dist", "index.html");
let html = fs.readFileSync(indexPath, "utf8");
html = injectPolyfillsScript(html, "js/aurobore-polyfills.js");
fs.writeFileSync(indexPath, html, "utf8");

console.log("[build:web] bundled w3c-demo → dist/");
