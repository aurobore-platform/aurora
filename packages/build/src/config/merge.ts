import type { NativeDeps, PluginManifest } from "../manifest/types.js";
import type { AggregatedNativeDeps, AuroboreConfig, EffectiveConfig } from "./types.js";

/** Извлекает короткое имя плагина из npm-имени (@aurobore/device → device). */
export function pluginNameFromRef(ref: string): string {
  const trimmed = ref.trim();
  if (trimmed.startsWith("@aurobore/")) {
    return trimmed.slice("@aurobore/".length);
  }
  if (trimmed.startsWith("@")) {
    const slash = trimmed.indexOf("/");
    return slash === -1 ? trimmed : trimmed.slice(slash + 1);
  }
  return trimmed;
}

function mergeNativeDeps(manifests: PluginManifest[]): AggregatedNativeDeps {
  const rpm = new Set<string>();
  const qt = new Set<string>();

  for (const manifest of manifests) {
    const deps: NativeDeps | undefined = manifest.nativeDeps;
    for (const item of deps?.rpm ?? []) rpm.add(item);
    for (const item of deps?.qt ?? []) qt.add(item);
  }

  return {
    rpm: [...rpm].sort(),
    qt: [...qt].sort(),
  };
}

function mergePermissions(config: AuroboreConfig, manifests: PluginManifest[]): string[] {
  const merged = new Set<string>(config.permissions ?? []);
  for (const manifest of manifests) {
    for (const permission of manifest.permissions ?? []) {
      merged.add(permission);
    }
  }
  return [...merged].sort((a, b) => a.localeCompare(b));
}

/** Сливает конфиг проекта с требованиями манифестов плагинов. */
export function resolveEffectiveConfig(
  config: AuroboreConfig,
  pluginManifests: PluginManifest[],
): EffectiveConfig {
  const resolvedPlugins = (config.plugins ?? []).map(pluginNameFromRef);

  return {
    ...config,
    effectivePermissions: mergePermissions(config, pluginManifests),
    nativeDeps: mergeNativeDeps(pluginManifests),
    resolvedPlugins,
  };
}
