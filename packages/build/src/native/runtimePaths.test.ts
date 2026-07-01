import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { syncRuntimeSiblings } from "./generate.js";
import {
  resolveBundledRuntimeRoot,
  resolvePluginNativeDir,
  resolveRuntimeRoot,
} from "./runtimePaths.js";

describe("runtimePaths", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function mkTempDir(prefix: string): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  it("resolveRuntimeRoot находит monorepo runtime", () => {
    const root = resolveRuntimeRoot();
    expect(fs.existsSync(path.join(root, "container"))).toBe(true);
  });

  it("resolveRuntimeRoot находит explicit runtime root", () => {
    const monorepoRuntime = resolveRuntimeRoot();
    const root = resolveRuntimeRoot({ explicit: monorepoRuntime });
    expect(root).toBe(monorepoRuntime);
  });

  it("resolveRuntimeRoot находит AUROBORE_RUNTIME_ROOT", () => {
    const monorepoRuntime = resolveRuntimeRoot();
    const prev = process.env.AUROBORE_RUNTIME_ROOT;
    process.env.AUROBORE_RUNTIME_ROOT = monorepoRuntime;
    try {
      expect(resolveRuntimeRoot({ projectRoot: mkTempDir("aurobore-runtime-env-") })).toBe(
        monorepoRuntime,
      );
    } finally {
      if (prev === undefined) delete process.env.AUROBORE_RUNTIME_ROOT;
      else process.env.AUROBORE_RUNTIME_ROOT = prev;
    }
  });

  it("resolveBundledRuntimeRoot находит @aurobore/runtime после prepare", () => {
    const bundled = resolveBundledRuntimeRoot();
    expect(bundled).not.toBeNull();
    expect(fs.existsSync(path.join(bundled!, "container"))).toBe(true);
  });

  it("resolvePluginNativeDir находит echo в monorepo", () => {
    const monorepoRuntime = resolveRuntimeRoot();
    const projectRoot = mkTempDir("aurobore-plugin-resolve-");
    const dir = resolvePluginNativeDir(projectRoot, "echo");
    expect(dir).not.toBeNull();
    expect(fs.existsSync(path.join(dir!, "native", "EchoPlugin.cpp"))).toBe(true);
    expect(monorepoRuntime).toBeTruthy();
  });
});

describe("syncRuntimeSiblings", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("не требует monorepo при пустом списке плагинов", () => {
    const stagingParent = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-staging-"));
    tempDirs.push(stagingParent);
    const stagingDir = path.join(stagingParent, "ru.test.app");
    fs.mkdirSync(stagingDir, { recursive: true });

    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-project-"));
    tempDirs.push(projectRoot);

    expect(() =>
      syncRuntimeSiblings(stagingDir, [], undefined, projectRoot),
    ).not.toThrow();

    expect(fs.existsSync(path.join(stagingParent, "bridge-native"))).toBe(true);
    expect(fs.existsSync(path.join(stagingParent, "native-sdk"))).toBe(true);
    expect(fs.existsSync(path.join(stagingParent, "plugins"))).toBe(false);
  });

  it("копирует echo native из monorepo plugins", () => {
    const stagingParent = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-staging-pl-"));
    tempDirs.push(stagingParent);
    const stagingDir = path.join(stagingParent, "ru.test.app");
    fs.mkdirSync(stagingDir, { recursive: true });

    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-project-pl-"));
    tempDirs.push(projectRoot);

    syncRuntimeSiblings(stagingDir, ["echo"], undefined, projectRoot);

    expect(
      fs.existsSync(path.join(stagingParent, "plugins", "echo", "native", "EchoPlugin.cpp")),
    ).toBe(true);
  });
});
