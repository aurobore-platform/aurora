import * as esbuild from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "../../../runtime/container/html/js");

mkdirSync(outDir, { recursive: true });

await esbuild.build({
  entryPoints: [join(here, "../src/bundle.ts")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  outfile: join(outDir, "aurobore-polyfills.js"),
  minify: false,
  sourcemap: false,
});

console.log(`[polyfills] bundle → ${join(outDir, "aurobore-polyfills.js")}`);
