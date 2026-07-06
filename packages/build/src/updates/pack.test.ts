import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { listWebRootFiles, packWebRoot } from "./pack.js";

describe("OTA pack", () => {
  const tmpDirs: string[] = [];

  afterEach(() => {
    for (const dir of tmpDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs.length = 0;
  });

  it("lists files in sorted order", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ota-pack-"));
    tmpDirs.push(root);
    fs.writeFileSync(path.join(root, "b.js"), "b");
    fs.writeFileSync(path.join(root, "a.js"), "a");
    fs.mkdirSync(path.join(root, "sub"));
    fs.writeFileSync(path.join(root, "sub", "c.js"), "c");
    expect(listWebRootFiles(root)).toEqual(["a.js", "b.js", "sub/c.js"]);
  });

  it("packs web root deterministically", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ota-pack-"));
    tmpDirs.push(root);
    const webRoot = path.join(root, "dist");
    fs.mkdirSync(webRoot);
    fs.writeFileSync(path.join(webRoot, "index.html"), "<html></html>");
    const out = path.join(root, "bundle.tar.gz");
    const first = await packWebRoot({ webRoot, outFile: out });
    const second = await packWebRoot({ webRoot, outFile: path.join(root, "bundle2.tar.gz") });
    expect(first.sha256).toBe(second.sha256);
    expect(first.size).toBeGreaterThan(0);
  });
});
