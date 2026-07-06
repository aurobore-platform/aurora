import * as esbuild from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "../../../runtime/container/html/js");

mkdirSync(outDir, { recursive: true });

const bundles = [
  { entry: join(here, "../src/bundle.ts"), outfile: join(outDir, "aurobore-bridge.js") },
  { entry: join(here, "../src/bundle-web.ts"), outfile: join(outDir, "aurobore-bridge-web.js") },
  { entry: join(here, "../src/web-shim.ts"), outfile: join(outDir, "aurobore-web-shim.js") },
];

for (const { entry, outfile } of bundles) {
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: "es2020",
    outfile,
    minify: false,
    sourcemap: false,
  });
  console.log(`[bridge-js] bundle → ${outfile}`);
}
