import fs from "node:fs";
import path from "node:path";
import * as esbuild from "esbuild";

export interface BundleWebAppOptions {
  /** Корень web-проекта (где src/ и dist/). */
  projectRoot: string;
  /** Точка входа TS/JS относительно projectRoot. */
  entry: string;
  /** Выходной файл относительно projectRoot (например dist/js/app.js). */
  outfile: string;
  /** Дополнительные пути для копирования в dist (относительно src/). */
  staticDirs?: string[];
  /** Минификация (default false). */
  minify?: boolean;
}

function copyDir(from: string, to: string): void {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

/** Собирает web-приложение: esbuild bundle + копирование статики. */
export async function bundleWebApp(options: BundleWebAppOptions): Promise<void> {
  const { projectRoot, entry, outfile, staticDirs = [], minify = false } = options;
  const entryPath = path.resolve(projectRoot, entry);
  const outPath = path.resolve(projectRoot, outfile);
  const distDir = path.dirname(outPath);

  fs.mkdirSync(distDir, { recursive: true });

  await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2020",
    outfile: outPath,
    minify,
    sourcemap: false,
    logLevel: "warning",
  });

  const srcRoot = path.join(projectRoot, "src");
  for (const rel of staticDirs) {
    const from = path.join(srcRoot, rel);
    const to = path.join(projectRoot, "dist", rel);
    if (fs.existsSync(from)) {
      if (fs.statSync(from).isDirectory()) copyDir(from, to);
      else {
        fs.mkdirSync(path.dirname(to), { recursive: true });
        fs.copyFileSync(from, to);
      }
    }
  }
}

/** CLI-хелпер: src/ts/app.ts → dist/js/app.js + index.html + css. */
export async function bundleVanillaWebApp(projectRoot: string): Promise<void> {
  const distRoot = path.join(projectRoot, "dist");
  if (fs.existsSync(distRoot)) fs.rmSync(distRoot, { recursive: true, force: true });

  await bundleWebApp({
    projectRoot,
    entry: "src/ts/app.ts",
    outfile: "dist/js/app.js",
    staticDirs: ["index.html", "css"],
  });
}
