/** OTA manifest v1 — см. ADR-012, RFC-002. */

export const OTA_MANIFEST_VERSION = 1 as const;
export const OTA_BUNDLE_FILENAME = "bundle.tar.gz" as const;
export const OTA_MANIFEST_FILENAME = "manifest.json" as const;
export const OTA_SIGNATURE_FILENAME = "manifest.sig" as const;
export const OTA_CHANNEL_POINTER_FILENAME = "latest.json" as const;

export type OtaBundleFormat = "tar+gzip";

/** Поля для canonical JSON перед подписью (без signature). */
export interface OtaManifestPayload {
  manifestVersion: typeof OTA_MANIFEST_VERSION;
  bundleVersion: string;
  channel: string;
  publishedAt: string;
  entry: string;
  minOs: string;
  minRuntimeVersion: string;
  runtimeVersion: string;
  bundleFormat: OtaBundleFormat;
  sha256: string;
  size: number;
}

/** Полный manifest с detached signature (base64). */
export interface OtaManifest extends OtaManifestPayload {
  signature: string;
}

export interface OtaChannelPointer {
  bundleVersion: string;
  manifestUrl: string;
  bundleUrl: string;
  publishedAt: string;
}

/** Стабильная сериализация для подписи (sorted keys). */
export function canonicalizeManifestPayload(payload: OtaManifestPayload): string {
  const ordered: Record<string, unknown> = {
    manifestVersion: payload.manifestVersion,
    bundleVersion: payload.bundleVersion,
    bundleFormat: payload.bundleFormat,
    channel: payload.channel,
    entry: payload.entry,
    minOs: payload.minOs,
    minRuntimeVersion: payload.minRuntimeVersion,
    publishedAt: payload.publishedAt,
    runtimeVersion: payload.runtimeVersion,
    sha256: payload.sha256,
    size: payload.size,
  };
  return JSON.stringify(ordered);
}

export function stripSignature(manifest: OtaManifest): OtaManifestPayload {
  const { signature: _sig, ...payload } = manifest;
  return payload;
}
