import fs from "node:fs";
import path from "node:path";
import { applyConfigDefaults } from "../config/defaults.js";
import { findConfigFile, parseConfig, validateConfig } from "../config/parse.js";
import { resolveRuntimeRoot } from "../native/runtimePaths.js";

const INIT_SCRIPT_KEYS = [
  "aurora:build",
  "aurora:run",
  "aurora:dev",
  "build:aurora",
] as const;
import type { AuroboreConfig } from "../config/types.js";

const VITE_CONFIG_NAMES = ["vite.config.ts", "vite.config.js", "vite.config.mjs"] as const;
const WEB_ROOT_CANDIDATES = ["dist", "build", "public"] as const;
const OUT_DIR_RE = /outDir\s*:\s*['"]([^'"]+)['"]/;

export type PackageManager = "pnpm" | "npm" | "yarn";

export interface InitConfigInput {
  appId: string;
  appName: string;
  version: string;
  webRoot: string;
  webEntry: string;
  internet: boolean;
  plugins?: string[];
}

export interface ApplyInitOptions extends InitConfigInput {
  force?: boolean;
  skipPackage?: boolean;
  skipGitignore?: boolean;
  dryRun?: boolean;
  /** Running @aurobore/cli version — added to devDependencies when patching package.json. */
  cliVersion?: string;
}

export interface InitProjectDefaults {
  appId: string;
  appName: string;
  version: string;
  webRoot: string;
  webEntry: string;
  internet: boolean;
  packageManager: PackageManager;
  hasBuildScript: boolean;
  hints: string[];
}

export interface InitResult {
  configPath: string | null;
  packageJsonUpdated: boolean;
  gitignoreUpdated: boolean;
  scriptsAdded: string[];
  cliAdded: boolean;
  hints: string[];
}

export interface ApplyRemoveInitOptions {
  dryRun?: boolean;
  skipPackage?: boolean;
  skipGitignore?: boolean;
  /** Не удалять каталог .aurobore/ (артефакты сборки). */
  keepCache?: boolean;
}

export interface RemoveInitResult {
  configRemoved: string | null;
  packageJsonUpdated: boolean;
  gitignoreUpdated: boolean;
  scriptsRemoved: string[];
  cliRemoved: boolean;
  cacheRemoved: boolean;
}

interface PackageJsonShape {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readPackageJson(projectRoot: string): PackageJsonShape | null {
  const pkgPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(pkgPath)) return null;
  return JSON.parse(fs.readFileSync(pkgPath, "utf8")) as PackageJsonShape;
}

function slugFromPackageName(name: string): string {
  return name
    .replace(/^@/, "")
    .replace(/\//g, "_")
    .replace(/-/g, "_")
    .replace(/[^a-z0-9_]/gi, "")
    .toLowerCase();
}

function readViteOutDir(projectRoot: string): string | null {
  for (const fileName of VITE_CONFIG_NAMES) {
    const filePath = path.join(projectRoot, fileName);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf8");
    const match = OUT_DIR_RE.exec(content);
    if (match?.[1]) return match[1];
  }
  return null;
}

function isViteProject(projectRoot: string): boolean {
  const pkg = readPackageJson(projectRoot);
  if (pkg) {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.vite) return true;
    const scripts = Object.values(pkg.scripts ?? {}).join(" ");
    if (/\bvite\b/.test(scripts)) return true;
  }
  return VITE_CONFIG_NAMES.some((f) => fs.existsSync(path.join(projectRoot, f)));
}

/** Определяет каталог web-сборки (dist/build/public или outDir из Vite). */
export function detectWebRoot(projectRoot: string): string {
  const fromVite = readViteOutDir(projectRoot);
  if (fromVite) return fromVite.replace(/^\.\//, "");

  if (isViteProject(projectRoot)) return "dist";

  for (const dir of WEB_ROOT_CANDIDATES) {
    if (fs.existsSync(path.join(projectRoot, dir))) return dir;
  }

  return "dist";
}

/** Определяет менеджер пакетов по lockfile. */
export function detectPackageManager(projectRoot: string): PackageManager {
  if (fs.existsSync(path.join(projectRoot, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(projectRoot, "yarn.lock"))) return "yarn";
  return "npm";
}

function collectFrameworkHints(projectRoot: string): string[] {
  const hints: string[] = [];
  const pkg = readPackageJson(projectRoot);
  if (!pkg) return hints;

  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (deps.vite || VITE_CONFIG_NAMES.some((f) => fs.existsSync(path.join(projectRoot, f)))) {
    hints.push("Vite: убедитесь, что в vite.config base: '/' (не путь вида '/repo-name/').");
  }
  if (deps.vue) {
    hints.push("Vue Router history mode поддерживается контейнером Aurobore.");
  }
  hints.push(
    "Иконка лаунчера: app.icon (например resources/icon.svg) или PNG в resources/icons/<size>x<size>/<app.id>.png",
  );

  return hints;
}

/** Нормализует semver приложения для aurobore.config (0.0.0 scaffold → 1.0.0). */
export function normalizeInitAppVersion(version: string | undefined): string {
  if (!version || !/^\d+\.\d+\.\d+/.test(version)) return "1.0.0";
  if (/^0+\.0+\.0+/.test(version)) return "1.0.0";
  return version;
}

/** Собирает дефолты для init из package.json и файловой структуры. */
export function collectInitDefaults(projectRoot: string): InitProjectDefaults {
  const pkg = readPackageJson(projectRoot);
  const dirName = path.basename(path.resolve(projectRoot));
  const slug = slugFromPackageName(pkg?.name ?? dirName) || "myapp";
  const rawVersion = pkg?.version && /^\d+\.\d+\.\d+/.test(pkg.version) ? pkg.version : "1.0.0";

  return {
    appId: `ru.example.${slug}`,
    appName: pkg?.name?.replace(/^@[^/]+\//, "") ?? dirName,
    version: normalizeInitAppVersion(rawVersion),
    webRoot: detectWebRoot(projectRoot),
    webEntry: "index.html",
    internet: true,
    packageManager: detectPackageManager(projectRoot),
    hasBuildScript: typeof pkg?.scripts?.build === "string",
    hints: collectFrameworkHints(projectRoot),
  };
}

/** Строит валидный AuroboreConfig из введённых значений. */
export function buildInitConfig(input: InitConfigInput): AuroboreConfig {
  const raw: AuroboreConfig = {
    configVersion: 1,
    app: {
      id: input.appId,
      name: input.appName,
      version: input.version,
      orientation: "portrait",
      icon: "resources/icon.svg",
    },
    web: {
      root: input.webRoot,
      entry: input.webEntry,
    },
    permissions: input.internet ? ["Internet"] : [],
    plugins: input.plugins ?? [],
  };

  const errors = validateConfig(raw);
  if (errors.length > 0) {
    const detail = errors.map((e) => `${e.path}: ${e.message}`).join("; ");
    throw new Error(`Invalid init config: ${detail}`);
  }

  return parseConfig(raw);
}

function configFilePath(projectRoot: string): string {
  return path.join(projectRoot, "aurobore.config.json");
}

export function buildInitPackageScripts(
  packageManager: PackageManager,
  hasBuildScript: boolean,
): Record<string, string> {
  const scripts: Record<string, string> = {
    "aurora:build": "aurobore build",
    "aurora:run": "aurobore run",
    "aurora:dev": "aurobore dev",
  };

  if (hasBuildScript) {
    scripts["build:aurora"] = `${packageManager} run build && aurobore build`;
  }

  return scripts;
}

function patchPackageJson(
  projectRoot: string,
  packageManager: PackageManager,
  hasBuildScript: boolean,
  cliVersion?: string,
): { updated: boolean; scriptsAdded: string[]; cliAdded: boolean } {
  const pkgPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return { updated: false, scriptsAdded: [], cliAdded: false };
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as PackageJsonShape & {
    scripts?: Record<string, string>;
  };
  const toAdd = buildInitPackageScripts(packageManager, hasBuildScript);
  const scriptsAdded: string[] = [];
  let changed = false;
  let cliAdded = false;

  pkg.scripts ??= {};
  for (const [key, value] of Object.entries(toAdd)) {
    if (pkg.scripts[key] === undefined) {
      pkg.scripts[key] = value;
      scriptsAdded.push(key);
      changed = true;
    }
  }

  if (cliVersion) {
    pkg.devDependencies ??= {};
    if (pkg.devDependencies["@aurobore/cli"] === undefined) {
      pkg.devDependencies["@aurobore/cli"] = `^${cliVersion}`;
      cliAdded = true;
      changed = true;
    }
  }

  if (!changed) {
    return { updated: false, scriptsAdded: [], cliAdded: false };
  }

  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  return { updated: true, scriptsAdded, cliAdded };
}

function appendGitignore(projectRoot: string): boolean {
  const gitignorePath = path.join(projectRoot, ".gitignore");
  const line = ".aurobore/";

  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, `${line}\n`, "utf8");
    return true;
  }

  const content = fs.readFileSync(gitignorePath, "utf8");
  if (content.split(/\r?\n/).some((l) => l.trim() === line || l.trim() === ".aurobore")) {
    return false;
  }

  const suffix = content.endsWith("\n") ? "" : "\n";
  fs.writeFileSync(gitignorePath, `${content}${suffix}${line}\n`, "utf8");
  return true;
}

function ensureDefaultIconResource(projectRoot: string): boolean {
  const dest = path.join(projectRoot, "resources", "icon.svg");
  if (fs.existsSync(dest)) {
    return false;
  }
  const runtime = resolveRuntimeRoot({ projectRoot });
  const src = path.join(runtime, "container", "icons", "placeholder.svg");
  if (!fs.existsSync(src)) {
    return false;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

/** Записывает aurobore.config.json, патчит package.json и .gitignore. */
export function applyInitToProject(
  projectRoot: string,
  options: ApplyInitOptions,
): InitResult {
  const resolvedRoot = path.resolve(projectRoot);
  const existing = findConfigFile(resolvedRoot);

  if (existing && !options.force) {
    throw new Error(
      `aurobore.config already exists (${existing}). Use --force to overwrite.`,
    );
  }

  const defaults = collectInitDefaults(resolvedRoot);
  const config = buildInitConfig({
    appId: options.appId,
    appName: options.appName,
    version: options.version,
    webRoot: options.webRoot,
    webEntry: options.webEntry,
    internet: options.internet,
    plugins: options.plugins,
  });

  const hints = [...defaults.hints];
  let configPath: string | null = null;
  let packageJsonUpdated = false;
  let gitignoreUpdated = false;
  let scriptsAdded: string[] = [];
  let cliAdded = false;

  if (options.dryRun) {
    return {
      configPath: configFilePath(resolvedRoot),
      packageJsonUpdated: false,
      gitignoreUpdated: false,
      scriptsAdded: Object.keys(
        buildInitPackageScripts(defaults.packageManager, defaults.hasBuildScript),
      ),
      cliAdded: false,
      hints,
    };
  }

  const normalized = applyConfigDefaults(config);
  const outPath = configFilePath(resolvedRoot);
  fs.writeFileSync(outPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  configPath = outPath;

  if (!options.skipPackage) {
    if (!fs.existsSync(path.join(resolvedRoot, "package.json"))) {
      hints.push("package.json не найден — скрипты aurora:* не добавлены.");
    } else {
      const patch = patchPackageJson(
        resolvedRoot,
        defaults.packageManager,
        defaults.hasBuildScript,
        options.cliVersion,
      );
      packageJsonUpdated = patch.updated;
      scriptsAdded = patch.scriptsAdded;
      cliAdded = patch.cliAdded;
    }
  }

  if (!options.skipGitignore) {
    gitignoreUpdated = appendGitignore(resolvedRoot);
  }

  if (ensureDefaultIconResource(resolvedRoot)) {
    hints.push("created resources/icon.svg (default placeholder — replace before release)");
  }

  return {
    configPath,
    packageJsonUpdated,
    gitignoreUpdated,
    scriptsAdded,
    cliAdded,
    hints,
  };
}

function unpatchPackageJson(
  projectRoot: string,
  packageManager: PackageManager,
  hasBuildScript: boolean,
): { updated: boolean; scriptsRemoved: string[]; cliRemoved: boolean } {
  const pkgPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return { updated: false, scriptsRemoved: [], cliRemoved: false };
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as PackageJsonShape & {
    scripts?: Record<string, string>;
  };
  const expected = buildInitPackageScripts(packageManager, hasBuildScript);
  const scriptsRemoved: string[] = [];
  let changed = false;
  let cliRemoved = false;

  if (pkg.scripts) {
    for (const key of INIT_SCRIPT_KEYS) {
      const current = pkg.scripts[key];
      const initValue = expected[key];
      if (current !== undefined && initValue !== undefined && current === initValue) {
        delete pkg.scripts[key];
        scriptsRemoved.push(key);
        changed = true;
      }
    }
    if (Object.keys(pkg.scripts).length === 0) {
      delete pkg.scripts;
    }
  }

  if (pkg.devDependencies?.["@aurobore/cli"] !== undefined) {
    delete pkg.devDependencies["@aurobore/cli"];
    if (Object.keys(pkg.devDependencies).length === 0) {
      delete pkg.devDependencies;
    }
    cliRemoved = true;
    changed = true;
  }

  if (!changed) {
    return { updated: false, scriptsRemoved: [], cliRemoved: false };
  }

  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, "utf8");
  return { updated: true, scriptsRemoved, cliRemoved };
}

function removeGitignoreLine(projectRoot: string): boolean {
  const gitignorePath = path.join(projectRoot, ".gitignore");
  if (!fs.existsSync(gitignorePath)) return false;

  const content = fs.readFileSync(gitignorePath, "utf8");
  const lines = content.split(/\r?\n/);
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    return trimmed !== ".aurobore/" && trimmed !== ".aurobore";
  });

  if (filtered.length === lines.length) return false;

  const next = filtered.join("\n");
  const suffix = next.length > 0 && !next.endsWith("\n") ? "\n" : "";
  fs.writeFileSync(gitignorePath, next.length === 0 ? "" : `${next}${suffix}`, "utf8");
  return true;
}

/** Откатывает изменения init: конфиг, скрипты, devDep CLI, .gitignore, .aurobore/. */
export function removeInitFromProject(
  projectRoot: string,
  options: ApplyRemoveInitOptions = {},
): RemoveInitResult {
  const resolvedRoot = path.resolve(projectRoot);
  const defaults = collectInitDefaults(resolvedRoot);
  const configPath = findConfigFile(resolvedRoot);
  const cacheDir = path.join(resolvedRoot, ".aurobore");

  if (options.dryRun) {
    return {
      configRemoved: configPath,
      packageJsonUpdated: false,
      gitignoreUpdated: false,
      scriptsRemoved: INIT_SCRIPT_KEYS.filter((key) => {
        const expected = buildInitPackageScripts(
          defaults.packageManager,
          defaults.hasBuildScript,
        );
        return expected[key] !== undefined;
      }),
      cliRemoved: false,
      cacheRemoved: !options.keepCache && fs.existsSync(cacheDir),
    };
  }

  let packageJsonUpdated = false;
  let gitignoreUpdated = false;
  let scriptsRemoved: string[] = [];
  let cliRemoved = false;
  let cacheRemoved = false;

  if (configPath && fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }

  if (!options.skipPackage && fs.existsSync(path.join(resolvedRoot, "package.json"))) {
    const patch = unpatchPackageJson(
      resolvedRoot,
      defaults.packageManager,
      defaults.hasBuildScript,
    );
    packageJsonUpdated = patch.updated;
    scriptsRemoved = patch.scriptsRemoved;
    cliRemoved = patch.cliRemoved;
  }

  if (!options.skipGitignore) {
    gitignoreUpdated = removeGitignoreLine(resolvedRoot);
  }

  if (!options.keepCache && fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    cacheRemoved = true;
  }

  return {
    configRemoved: configPath,
    packageJsonUpdated,
    gitignoreUpdated,
    scriptsRemoved,
    cliRemoved,
    cacheRemoved,
  };
}
