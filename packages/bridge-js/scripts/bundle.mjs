import * as esbuild from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outFile = join(here, "../../../runtime/container/html/js/aurobore-bridge.js");

mkdirSync(dirname(outFile), { recursive: true });

await esbuild.build({
  entryPoints: [join(here, "../src/bundle.ts")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  outfile: outFile,
  minify: false,
  sourcemap: false,
});

console.log(`[bridge-js] bundle → ${outFile}`);
