/** MVP built-in plugins shipped with Aurobore runtime. */
export const BUILTIN_PLUGINS = [
  "echo",
  "device",
  "storage",
  "filesystem",
  "clipboard",
  "network",
  "camera",
  "geolocation",
  "notifications",
  "share",
  "sensors",
] as const;

export type BuiltinPluginName = (typeof BUILTIN_PLUGINS)[number];

export function normalizePluginName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.startsWith("@aurobore/")) {
    return trimmed.slice("@aurobore/".length);
  }
  if (trimmed.startsWith("@")) {
    const slash = trimmed.indexOf("/");
    return slash === -1 ? trimmed : trimmed.slice(slash + 1);
  }
  return trimmed;
}

export function isBuiltinPlugin(name: string): boolean {
  return (BUILTIN_PLUGINS as readonly string[]).includes(normalizePluginName(name));
}

export function builtinNpmRef(name: string): string {
  const short = normalizePluginName(name);
  return `@aurobore/${short}`;
}

export function formatBuiltinPluginList(): string {
  return BUILTIN_PLUGINS.map((p) => `@aurobore/${p}`).join(", ");
}

/** Plugin refs from config — no implicit echo stub. */
export function resolvePluginRefs(plugins?: string[] | null): string[] {
  return plugins ?? [];
}
