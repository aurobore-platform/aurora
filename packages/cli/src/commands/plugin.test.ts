import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { listPlugins, formatPluginList } from "@aurobore/build";
import { runPluginCommand } from "./plugin.js";
import { parseArgs } from "../args.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
const stubRoot = path.join(repoRoot, "examples", "hello-world-stub");

describe("plugin CLI", () => {
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
