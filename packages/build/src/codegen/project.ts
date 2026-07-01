import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateJsWrapper,
  generateNativeRegistry,
  generatePluginBundle,
  generateTypes,
} from "./generate.js";
import { parseManifest } from "../manifest/parse.js";
import type { PluginManifest } from "../manifest/types.js";
import { pluginNameFromRef } from "../config/merge.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface ProjectCodegenOptions {
  projectRoot: string;
  pluginNames: string[];
  resolveManifest: (name: string) => PluginManifest;
  /** Куда писать native registry (default: projectRoot/.aurobore/native/generated). */
  nativeOutDir?: string;
  /** Куда писать aurobore-plugins.js (default: projectRoot/.aurobore/native/html/js). */
  pluginsBundlePath?: string;
  /** Генерировать per-plugin JS в node_modules-подобных путях (optional). */
  emitPluginWrappers?: boolean;
}

export interface ProjectCodegenResult {
  manifests: PluginManifest[];
  pluginNames: string[];
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

/** Резолвит манифесты плагинов по списку имён или npm-ref из конфига. */
export function resolvePluginManifests(
  projectRoot: string,
  pluginRefs: string[],
  monorepoRoot?: string,
): PluginManifest[] {
  const root = monorepoRoot ?? findMonorepoRoot(projectRoot) ?? findMonorepoRoot();
  const names = pluginRefs.map(pluginNameFromRef);
  return names.map((name) => {
    const manifestPath = findManifestPath(projectRoot, name, root ?? undefined);
    if (!manifestPath) {
      throw new Error(`plugin manifest not found for "${name}"`);
    }
    const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    return parseManifest(raw);
  });
}

/** Ищет plugin.manifest для плагина. */
export function findManifestPath(
  projectRoot: string,
  pluginName: string,
  monorepoRoot?: string,
): string | null {
  const candidates = [
    path.join(projectRoot, "plugins", pluginName, "plugin.manifest"),
    path.join(projectRoot, "node_modules", "@aurobore", pluginName, "plugin.manifest"),
    path.join(projectRoot, "node_modules", pluginName, "plugin.manifest"),
  ];
  if (monorepoRoot) {
    candidates.push(path.join(monorepoRoot, "plugins", pluginName, "plugin.manifest"));
  }
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/** Находит корень монорепо (pnpm-workspace.yaml). */
export function findMonorepoRoot(startDir?: string): string | null {
  let dir = startDir ?? path.resolve(__dirname, "../../..");
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    dir = path.dirname(dir);
  }
  return null;
}

/** Кодогенерация JS/TS-обёрток и native registry для проекта. */
export function runProjectCodegen(options: ProjectCodegenOptions): ProjectCodegenResult {
  const nativeOutDir = options.nativeOutDir ?? path.join(options.projectRoot, ".aurobore", "native", "generated");
  const pluginsBundlePath =
    options.pluginsBundlePath ??
    path.join(options.projectRoot, ".aurobore", "native", "html", "js", "aurobore-plugins.js");

  const manifests = options.pluginNames.map((name) => options.resolveManifest(name));

  if (options.emitPluginWrappers) {
    for (const manifest of manifests) {
      const pluginDir = path.join(options.projectRoot, "node_modules", "@aurobore", manifest.name, "generated");
      writeFile(path.join(pluginDir, "index.js"), generateJsWrapper(manifest));
      writeFile(path.join(pluginDir, "index.d.ts"), generateTypes(manifest));
    }
  }

  const registry = generateNativeRegistry(manifests);
  writeFile(path.join(nativeOutDir, "PluginRegistry.h"), registry.header);
  writeFile(path.join(nativeOutDir, "PluginRegistry.cpp"), registry.source);
  writeFile(pluginsBundlePath, generatePluginBundle(manifests));

  return { manifests, pluginNames: options.pluginNames.map(pluginNameFromRef) };
}

/** Запуск codegen для проекта по списку npm-ref плагинов из конфига. */
export function runProjectCodegenFromConfig(
  projectRoot: string,
  pluginRefs: string[],
): ProjectCodegenResult {
  const monorepoRoot = findMonorepoRoot(projectRoot) ?? findMonorepoRoot();
  const names = pluginRefs.map(pluginNameFromRef);

  return runProjectCodegen({
    projectRoot,
    pluginNames: names,
    resolveManifest: (name) => {
      const manifestPath = findManifestPath(projectRoot, name, monorepoRoot ?? undefined);
      if (!manifestPath) {
        throw new Error(
          `plugin manifest not found for "${name}" (searched node_modules and monorepo plugins/)`,
        );
      }
      return parseManifest(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
    },
  });
}
