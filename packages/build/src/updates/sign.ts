import crypto from "node:crypto";
import fs from "node:fs";

import {
  canonicalizeManifestPayload,
  type OtaManifest,
  type OtaManifestPayload,
} from "./manifest.js";

export interface Ed25519KeyPair {
  publicKey: string;
  privateKeyPem: string;
}

export function generateEd25519KeyPair(): Ed25519KeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const publicKeyDer = publicKey.export({ type: "spki", format: "der" });
  const rawPub = publicKeyDer.subarray(publicKeyDer.length - 32);
  return {
    publicKey: rawPub.toString("base64"),
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
}

export function loadPrivateKeyPem(path: string): string {
  return fs.readFileSync(path, "utf8");
}

export function signManifestPayload(
  payload: OtaManifestPayload,
  privateKeyPem: string,
): string {
  const data = Buffer.from(canonicalizeManifestPayload(payload), "utf8");
  const key = crypto.createPrivateKey(privateKeyPem);
  return crypto.sign(null, data, key).toString("base64");
}

export function verifyManifestSignature(
  manifest: OtaManifest,
  publicKeyBase64: string,
): boolean {
  const { signature, ...rest } = manifest;
  const payload = rest as OtaManifestPayload;
  const data = Buffer.from(canonicalizeManifestPayload(payload), "utf8");
  const sig = Buffer.from(signature, "base64");
  const keyBytes = Buffer.from(publicKeyBase64, "base64");
  if (keyBytes.length !== 32) return false;
  const derPrefix = Buffer.from("302a300506032b6570032100", "hex");
  const spki = Buffer.concat([derPrefix, keyBytes]);
  const key = crypto.createPublicKey({ key: spki, format: "der", type: "spki" });
  return crypto.verify(null, data, key, sig);
}

export function writeKeyPair(outDir: string, pair: Ed25519KeyPair): { publicPath: string; privatePath: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const publicPath = `${outDir}/public.key`;
  const privatePath = `${outDir}/private.pem`;
  fs.writeFileSync(publicPath, `${pair.publicKey}\n`);
  fs.writeFileSync(privatePath, pair.privateKeyPem, { mode: 0o600 });
  return { publicPath, privatePath };
}
