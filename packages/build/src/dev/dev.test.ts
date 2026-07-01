import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { detectDevBackend, isVanillaEsbuildProject, materializeDevAssets } from "@aurobore/build";

describe("dev detect", () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("detects vanilla esbuild project", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-dev-"));
    fs.mkdirSync(path.join(tmpDir, "src", "ts"), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, "src", "ts", "app.ts"), "console.log(1)");
    expect(isVanillaEsbuildProject(tmpDir)).toBe(true);
    expect(detectDevBackend(tmpDir)).toBe("esbuild");
  });

  it("detects vite project from devDependency", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-dev-"));
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ devDependencies: { vite: "^6.0.0" } }),
    );
    expect(detectDevBackend(tmpDir)).toBe("vite");
  });

  it("forceStatic overrides vite", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-dev-"));
    fs.writeFileSync(
      path.join(tmpDir, "package.json"),
      JSON.stringify({ devDependencies: { vite: "^6.0.0" } }),
    );
    expect(detectDevBackend(tmpDir, true)).toBe("static");
  });
});

describe("materializeDevAssets", () => {
  it("writes bridge files when aurobore.config exists", () => {
    const repoRoot = path.resolve(import.meta.dirname, "../../../..");
    const stubRoot = path.join(repoRoot, "examples", "hello-world-stub");
    if (!fs.existsSync(path.join(stubRoot, "aurobore.config.json"))) return;

    const assets = materializeDevAssets(stubRoot);
    expect(fs.existsSync(path.join(assets.jsDir, "aurobore-bridge.js"))).toBe(true);
    expect(fs.existsSync(path.join(assets.jsDir, "aurobore-plugins.js"))).toBe(true);
    expect(fs.existsSync(path.join(assets.cssDir, "aurobore-chrome.css"))).toBe(true);
  });
});
