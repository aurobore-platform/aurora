import fs from "node:fs";
import path from "node:path";

export type DevBackendKind = "vite" | "esbuild" | "static";

const VITE_CONFIG_NAMES = ["vite.config.ts", "vite.config.js", "vite.config.mjs"] as const;

function readPackageJson(projectRoot: string): Record<string, unknown> | null {
  const pkgPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(pkgPath)) return null;
  return JSON.parse(fs.readFileSync(pkgPath, "utf8")) as Record<string, unknown>;
}

/** Проект использует Vite (deps, scripts или vite.config). */
export function isViteProject(projectRoot: string): boolean {
  const pkg = readPackageJson(projectRoot);
  if (pkg) {
    const deps = {
      ...(pkg.dependencies as Record<string, string> | undefined),
      ...(pkg.devDependencies as Record<string, string> | undefined),
    };
    if (deps.vite) return true;
    const scripts = Object.values((pkg.scripts as Record<string, string> | undefined) ?? {}).join(" ");
    if (/\bvite\b/.test(scripts)) return true;
  }
  return VITE_CONFIG_NAMES.some((f) => fs.existsSync(path.join(projectRoot, f)));
}

/** Vanilla Aurobore-шаблон: TypeScript entry в src/ts/app.ts. */
export function isVanillaEsbuildProject(projectRoot: string): boolean {
  return fs.existsSync(path.join(projectRoot, "src", "ts", "app.ts"));
}

/** Определяет dev backend для проекта. */
export function detectDevBackend(projectRoot: string, forceStatic = false): DevBackendKind {
  if (forceStatic) return "static";
  if (isViteProject(projectRoot)) return "vite";
  if (isVanillaEsbuildProject(projectRoot)) return "esbuild";
  return "static";
}

/** Корень исходников для static/esbuild dev (не prod dist). */
export function resolveDevWebRoot(projectRoot: string, webRoot: string): string {
  if (webRoot === "dist" && fs.existsSync(path.join(projectRoot, "src"))) {
    return path.join(projectRoot, "src");
  }
  return path.join(projectRoot, webRoot);
}
