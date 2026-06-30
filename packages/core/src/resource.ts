/** Логический префикс URL ресурсов в app-data (см. docs/architecture/bridge.md §7). */
export const APP_DATA_URL_PREFIX = "aurobore-app://localhost/app-data/" as const;

export const RESOURCE_REF_KIND = "resource" as const;

/** Ссылка на бинарный ресурс, загружаемый через Asset Loader (FR-B7). */
export interface ResourceRef {
  kind: typeof RESOURCE_REF_KIND;
  url: string;
  mimeType?: string;
  size?: number;
}

export function createResourceRef(
  relativePath: string,
  options?: { mimeType?: string; size?: number },
): ResourceRef {
  const normalized = relativePath.replace(/^\/+/, "");
  return {
    kind: RESOURCE_REF_KIND,
    url: `${APP_DATA_URL_PREFIX}${normalized}`,
    ...(options?.mimeType === undefined ? {} : { mimeType: options.mimeType }),
    ...(options?.size === undefined ? {} : { size: options.size }),
  };
}

export function isResourceRef(value: unknown): value is ResourceRef {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as ResourceRef).kind === RESOURCE_REF_KIND &&
    typeof (value as ResourceRef).url === "string"
  );
}

/**
 * Преобразует логический ResourceRef URL в wire URL для fetch/img.
 * По умолчанию использует `location.origin` (loopback HTTPS в runtime).
 */
export function resolveResourceUrl(ref: ResourceRef | string, baseOrigin?: string): string {
  const url = typeof ref === "string" ? ref : ref.url;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  const origin =
    baseOrigin ??
    (() => {
      const g = globalThis as unknown as { location?: { origin?: string } };
      return typeof g.location?.origin === "string" ? g.location.origin : "";
    })();

  if (url.startsWith("aurobore-app://localhost")) {
    const path = url.slice("aurobore-app://localhost".length) || "/";
    return origin + (path.startsWith("/") ? path : `/${path}`);
  }

  return url;
}
