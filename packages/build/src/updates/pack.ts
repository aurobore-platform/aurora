import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createGzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import * as tar from "tar";

import { OTA_BUNDLE_FILENAME } from "./manifest.js";

const FIXED_MTIME = new Date("2020-01-01T00:00:00.000Z");

export interface PackWebRootOptions {
  webRoot: string;
  outFile?: string;
}

export interface PackWebRootResult {
  bundlePath: string;
  sha256: string;
  size: number;
}

/** Собирает детерминированный список файлов из webRoot (относительные пути, sorted). */
export function listWebRootFiles(webRoot: string, relativeDir = ""): string[] {
  const abs = path.join(webRoot, relativeDir);
  const entries = fs.readdirSync(abs, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...listWebRootFiles(webRoot, rel));
    } else if (entry.isFile()) {
      files.push(rel.replace(/\\/g, "/"));
    }
  }
  return files;
}

/** Упаковывает webRoot в gzip tar (детерминированный порядок и mtime). */
export async function packWebRoot(options: PackWebRootOptions): Promise<PackWebRootResult> {
  const { webRoot } = options;
  if (!fs.existsSync(webRoot)) {
    throw new Error(`web root not found: ${webRoot}`);
  }

  const bundlePath = options.outFile ?? path.join(webRoot, "..", OTA_BUNDLE_FILENAME);
  const tarPath = `${bundlePath}.tmp.tar`;
  const files = listWebRootFiles(webRoot);

  await tar.create(
    {
      file: tarPath,
      cwd: webRoot,
      portable: true,
      mtime: FIXED_MTIME,
      gzip: false,
      noPax: true,
    },
    files,
  );

  await pipeline(
    fs.createReadStream(tarPath),
    createGzip({ level: 9 }),
    fs.createWriteStream(bundlePath),
  );
  fs.unlinkSync(tarPath);

  const data = fs.readFileSync(bundlePath);
  const sha256 = crypto.createHash("sha256").update(data).digest("hex");
  return { bundlePath, sha256, size: data.length };
}
