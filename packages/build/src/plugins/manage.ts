import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pluginNameFromRef } from "../config/merge.js";
import { loadConfig } from "../config/parse.js";
import { parseManifest } from "../manifest/parse.js";
import type { PluginManifest } from "../manifest/types.js";
import { findManifestPath, findMonorepoRoot } from "../codegen/project.js";
import { runProjectCodegenFromConfig } from "../codegen/project.js";
import { refreshNativePluginArtifacts } from "./refresh.js";
import {
  builtinNpmRef,
  formatBuiltinPluginList,
  isBuiltinPlugin,
  normalizePluginName,
  resolvePluginRefs,
} from "./catalog.js";
import { checkPluginCompat, type PluginCompatStatus } from "./resolve.js";

export type PluginSource = "built-in" | "npm";

export interface PluginListEntry {
  name: string;
  ref: string;
  version: string;
  status: PluginCompatStatus;
  statusDetail: string;
  permissions: string[];
  source: PluginSource;
}

export interface AddPluginOptions {
  forceExternal?: boolean;
}

export interface RemovePluginOptions {
  keepNpm?: boolean;
}

function configPath(projectRoot: string): string {
  return path.join(projectRoot, "aurobore.config.json");
}

function readConfigRaw(projectRoot: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(configPath(projectRoot), "utf8")) as Record<string, unknown>;
}

function writeConfigRaw(projectRoot: string, raw: Record<string, unknown>): void {
  fs.writeFileSync(configPath(projectRoot), `${JSON.stringify(raw, null, 2)}\n`, "utf8");
}

function pluginRefsFromConfig(projectRoot: string): string[] {
  const raw = readConfigRaw(projectRoot);
  return (raw.plugins as string[] | undefined) ?? [];
}

function resolveManifestForProject(projectRoot: string, name: string): PluginManifest {
  const monorepoRoot = findMonorepoRoot(projectRoot) ?? findMonorepoRoot();
  const manifestPath = findManifestPath(projectRoot, name, monorepoRoot ?? undefined);
  if (!manifestPath) {
    throw new Error(
      `plugin manifest not found for "${name}" (built-in: ${formatBuiltinPluginList()})`,
    );
  }
  return parseManifest(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
}

function detectSource(projectRoot: string, name: string): PluginSource {
  const npmPath = path.join(projectRoot, "node_modules", "@aurobore", name, "plugin.manifest");
  if (fs.existsSync(npmPath)) return "npm";
  if (isBuiltinPlugin(name)) return "built-in";
  return "npm";
}

function installNpmPackage(projectRoot: string, ref: string): void {
  let res = spawnSync("pnpm", ["add", ref, "--save-prod"], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
  });
  if (res.status !== 0) {
    res = spawnSync("npm", ["install", "--save", ref], {
      cwd: projectRoot,
      stdio: "inherit",
      shell: true,
    });
  }
  if (res.status !== 0) {
    throw new Error(`failed to install npm package ${ref}`);
  }
}

function uninstallNpmPackage(projectRoot: string, ref: string): void {
  let res = spawnSync("pnpm", ["remove", ref], {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
  });
  if (res.status !== 0) {
    res = spawnSync("npm", ["uninstall", ref], {
      cwd: projectRoot,
      stdio: "inherit",
      shell: true,
    });
  }
}

function applyPluginChanges(projectRoot: string, pluginRefs: string[]): void {
  const refs = resolvePluginRefs(pluginRefs);
  runProjectCodegenFromConfig(projectRoot, refs);
  refreshNativePluginArtifacts(projectRoot);
}

/** Список плагинов проекта с версиями и совместимостью. */
export function listPlugins(projectRoot: string): PluginListEntry[] {
  loadConfig(projectRoot);
  const refs = resolvePluginRefs(pluginRefsFromConfig(projectRoot));

  return refs.map((ref) => {
    const name = pluginNameFromRef(ref);
    const manifest = resolveManifestForProject(projectRoot, name);
    const compat = checkPluginCompat(manifest);
    return {
      name,
      ref,
      version: manifest.version,
      status: compat.status,
      statusDetail: compat.detail,
      permissions: manifest.permissions ?? [],
      source: detectSource(projectRoot, name),
    };
  });
}

/** Форматирует listPlugins для CLI. */
export function formatPluginList(entries: PluginListEntry[]): string {
  if (entries.length === 0) {
    return "(none)";
  }
  const header = "NAME       REF                  VERSION   STATUS  SOURCE    PERMISSIONS";
  const lines = entries.map((e) => {
    const perms = e.permissions.length > 0 ? e.permissions.join(";") : "(none)";
    return [
      e.name.padEnd(10),
      e.ref.padEnd(20),
      e.version.padEnd(9),
      e.status.padEnd(7),
      e.source.padEnd(9),
      perms,
    ].join(" ");
  });
  return [header, ...lines].join("\n");
}

/** Добавляет плагин в проект. */
export function addPlugin(
  projectRoot: string,
  name: string,
  options: AddPluginOptions = {},
): PluginListEntry {
  const short = normalizePluginName(name);
  const ref = builtinNpmRef(short);
  const raw = readConfigRaw(projectRoot);
  const plugins = (raw.plugins as string[] | undefined) ?? [];

  if (plugins.some((p) => pluginNameFromRef(p) === short)) {
    const existing = listPlugins(projectRoot).find((e) => e.name === short);
    if (existing) return existing;
  }

  const useNpm = options.forceExternal || !isBuiltinPlugin(short);

  if (useNpm) {
    installNpmPackage(projectRoot, ref);
  }

  const manifest = resolveManifestForProject(projectRoot, short);
  const compat = checkPluginCompat(manifest);
  if (compat.status === "fail") {
    throw new Error(`plugin ${ref} incompatible: ${compat.detail}`);
  }

  if (!plugins.includes(ref)) {
    plugins.push(ref);
    raw.plugins = plugins;
    writeConfigRaw(projectRoot, raw);
  }

  applyPluginChanges(projectRoot, plugins);

  return {
    name: short,
    ref,
    version: manifest.version,
    status: compat.status,
    statusDetail: compat.detail,
    permissions: manifest.permissions ?? [],
    source: useNpm ? "npm" : "built-in",
  };
}

/** Удаляет плагин из проекта. */
export function removePlugin(
  projectRoot: string,
  name: string,
  options: RemovePluginOptions = {},
): void {
  const short = normalizePluginName(name);
  const ref = builtinNpmRef(short);
  const raw = readConfigRaw(projectRoot);
  const plugins = ((raw.plugins as string[] | undefined) ?? []).filter(
    (p) => pluginNameFromRef(p) !== short,
  );
  raw.plugins = plugins;
  writeConfigRaw(projectRoot, raw);

  if (!options.keepNpm && fs.existsSync(path.join(projectRoot, "node_modules", "@aurobore", short))) {
    uninstallNpmPackage(projectRoot, ref);
  }

  applyPluginChanges(projectRoot, plugins);
}
