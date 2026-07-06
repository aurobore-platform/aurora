import fs from "node:fs";
import path from "node:path";

import type { AuroboreConfig } from "../config/types.js";
import { packWebRoot } from "./pack.js";
import {
  OTA_BUNDLE_FILENAME,
  OTA_CHANNEL_POINTER_FILENAME,
  OTA_MANIFEST_FILENAME,
  OTA_MANIFEST_VERSION,
  OTA_SIGNATURE_FILENAME,
  type OtaChannelPointer,
  type OtaManifest,
  type OtaManifestPayload,
} from "./manifest.js";
import { loadPrivateKeyPem, signManifestPayload } from "./sign.js";

export const DEFAULT_MIN_RUNTIME_VERSION = "0.0.3";
export const DEFAULT_RUNTIME_VERSION = "0.0.3";

export interface PublishOtaBundleOptions {
  projectRoot: string;
  config: AuroboreConfig;
  outDir: string;
  channel?: string;
  bundleVersion?: string;
  privateKeyPath: string;
  baseUrl?: string;
  dryRun?: boolean;
}

export interface PublishOtaBundleResult {
  channel: string;
  bundleVersion: string;
  versionDir: string;
  manifest: OtaManifest;
  channelPointer: OtaChannelPointer;
}

function joinUrl(base: string, ...segments: string[]): string {
  const trimmed = base.replace(/\/+$/, "");
  const pathPart = segments.map((s) => s.replace(/^\/+/, "")).join("/");
  return `${trimmed}/${pathPart}`;
}

export async function publishOtaBundle(
  options: PublishOtaBundleOptions,
): Promise<PublishOtaBundleResult> {
  const channel = options.channel ?? options.config.updates?.channel ?? "stable";
  const bundleVersion = options.bundleVersion ?? options.config.app.version;
  const webRoot = path.join(options.projectRoot, options.config.web.root);
  const versionDir = path.join(options.outDir, channel, bundleVersion);
  const baseUrl = options.baseUrl ?? options.config.updates?.url ?? "";

  fs.mkdirSync(versionDir, { recursive: true });

  const { bundlePath, sha256, size } = await packWebRoot({
    webRoot,
    outFile: path.join(versionDir, OTA_BUNDLE_FILENAME),
  });

  const payload: OtaManifestPayload = {
    manifestVersion: OTA_MANIFEST_VERSION,
    bundleVersion,
    channel,
    publishedAt: new Date().toISOString(),
    entry: options.config.web.entry,
    minOs: options.config.build?.minOs ?? "5.1.5",
    minRuntimeVersion: DEFAULT_MIN_RUNTIME_VERSION,
    runtimeVersion: DEFAULT_RUNTIME_VERSION,
    bundleFormat: "tar+gzip",
    sha256,
    size,
  };

  const privateKeyPem = loadPrivateKeyPem(options.privateKeyPath);
  const signature = signManifestPayload(payload, privateKeyPem);
  const manifest: OtaManifest = { ...payload, signature };

  const manifestUrl = baseUrl
    ? joinUrl(baseUrl, channel, bundleVersion, OTA_MANIFEST_FILENAME)
    : `${channel}/${bundleVersion}/${OTA_MANIFEST_FILENAME}`;
  const bundleUrl = baseUrl
    ? joinUrl(baseUrl, channel, bundleVersion, OTA_BUNDLE_FILENAME)
    : `${channel}/${bundleVersion}/${OTA_BUNDLE_FILENAME}`;

  const channelPointer: OtaChannelPointer = {
    bundleVersion,
    manifestUrl,
    bundleUrl,
    publishedAt: payload.publishedAt,
  };

  if (options.dryRun) {
    return { channel, bundleVersion, versionDir, manifest, channelPointer };
  }

  fs.mkdirSync(versionDir, { recursive: true });
  if (bundlePath !== path.join(versionDir, OTA_BUNDLE_FILENAME)) {
    fs.copyFileSync(bundlePath, path.join(versionDir, OTA_BUNDLE_FILENAME));
  }
  fs.writeFileSync(
    path.join(versionDir, OTA_MANIFEST_FILENAME),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(versionDir, OTA_SIGNATURE_FILENAME),
    `${signature}\n`,
  );
  fs.writeFileSync(
    path.join(options.outDir, channel, OTA_CHANNEL_POINTER_FILENAME),
    `${JSON.stringify(channelPointer, null, 2)}\n`,
  );

  return { channel, bundleVersion, versionDir, manifest, channelPointer };
}

export interface ListOtaVersionsOptions {
  outDir: string;
  channel?: string;
}

export function listOtaVersions(options: ListOtaVersionsOptions): string[] {
  const channel = options.channel ?? "stable";
  const channelDir = path.join(options.outDir, channel);
  if (!fs.existsSync(channelDir)) return [];
  return fs
    .readdirSync(channelDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

export function rollbackOtaChannel(options: {
  outDir: string;
  channel: string;
  toVersion: string;
  baseUrl?: string;
}): OtaChannelPointer {
  const versionDir = path.join(options.outDir, options.channel, options.toVersion);
  const manifestPath = path.join(versionDir, OTA_MANIFEST_FILENAME);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest not found for version ${options.toVersion}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as OtaManifest;
  const baseUrl = options.baseUrl ?? "";
  const manifestUrl = baseUrl
    ? joinUrl(baseUrl, options.channel, options.toVersion, OTA_MANIFEST_FILENAME)
    : `${options.channel}/${options.toVersion}/${OTA_MANIFEST_FILENAME}`;
  const bundleUrl = baseUrl
    ? joinUrl(baseUrl, options.channel, options.toVersion, OTA_BUNDLE_FILENAME)
    : `${options.channel}/${options.toVersion}/${OTA_BUNDLE_FILENAME}`;

  const channelPointer: OtaChannelPointer = {
    bundleVersion: manifest.bundleVersion,
    manifestUrl,
    bundleUrl,
    publishedAt: manifest.publishedAt,
  };
  fs.writeFileSync(
    path.join(options.outDir, options.channel, OTA_CHANNEL_POINTER_FILENAME),
    `${JSON.stringify(channelPointer, null, 2)}\n`,
  );
  return channelPointer;
}
