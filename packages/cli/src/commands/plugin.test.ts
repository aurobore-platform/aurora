import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { formatPluginList, listPlugins } from "@aurobore/build";
import { runPluginCommand } from "./plugin.js";
import { parseArgs } from "../args.js";

const repoRoot = path.resolve(import.meta.dirname, "../../../..");
const stubRoot = path.join(repoRoot, "examples", "hello-world-stub");

describe("plugin CLI", () => {
  let tmpDir: string;

  afterEach(() => {
    process.chdir(repoRoot);
    if (tmpDir && fs.existsSync(tmpDir)) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* Windows may lock cwd briefly */
      }
    }
  });

  it("create scaffolds plugin in cwd/plugins/", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-plugin-cli-"));
    process.chdir(tmpDir);
    const code = runPluginCommand(parseArgs(["create", "testplug", "--display", "Test Plug"]));
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(tmpDir, "plugins", "testplug", "plugin.manifest"))).toBe(true);
  });
  it("listPlugins на hello-world-stub", () => {
    if (!fs.existsSync(path.join(stubRoot, "aurobore.config.json"))) return;

    const entries = listPlugins(stubRoot);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.some((e) => e.name === "device")).toBe(true);

    const formatted = formatPluginList(entries);
    expect(formatted).toContain("VERSION");
    expect(formatted).toContain("device");
  });

  it("runPluginCommand list возвращает 0", () => {
    if (!fs.existsSync(path.join(stubRoot, "aurobore.config.json"))) return;

    const cwd = process.cwd();
    process.chdir(stubRoot);
    try {
      const code = runPluginCommand(parseArgs(["list"]));
      expect(code).toBe(0);
    } finally {
      process.chdir(cwd);
    }
  });
});
