import { describe, expect, it } from "vitest";

import { OTA_MANIFEST_VERSION, type OtaManifestPayload } from "./manifest.js";
import {
  generateEd25519KeyPair,
  signManifestPayload,
  verifyManifestSignature,
} from "./sign.js";

describe("OTA sign", () => {
  it("round-trip sign and verify", () => {
    const pair = generateEd25519KeyPair();
    const payload: OtaManifestPayload = {
      manifestVersion: OTA_MANIFEST_VERSION,
      bundleVersion: "1.0.0",
      channel: "stable",
      publishedAt: "2026-07-06T00:00:00.000Z",
      entry: "index.html",
      minOs: "5.1.5",
      minRuntimeVersion: "0.0.3",
      runtimeVersion: "0.0.3",
      bundleFormat: "tar+gzip",
      sha256: "abc123",
      size: 42,
    };
    const signature = signManifestPayload(payload, pair.privateKeyPem);
    const manifest = { ...payload, signature };
    expect(verifyManifestSignature(manifest, pair.publicKey)).toBe(true);
    expect(verifyManifestSignature(manifest, "invalid")).toBe(false);
  });
});
