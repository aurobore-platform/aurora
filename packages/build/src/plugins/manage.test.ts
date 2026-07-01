import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findMonorepoRoot } from "../codegen/project.js";
import { addPlugin, listPlugins, removePlugin } from "./manage.js";
import { isBuiltinPlugin } from "./catalog.js";
import { refreshNativePluginArtifacts } from "./refresh.js";
import { generateNativeProject } from "../native/generate.js";
import { loadConfig } from "../config/parse.js";

const tempDirs: string[] = [];

function makeProject(plugins: string[] = ["@aurobore/echo"]): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-plugin-test-"));
  tempDirs.push(dir);
  fs.writeFileSync(
    path.join(dir, "aurobore.config.json"),
    `${JSON.stringify(
      {
        configVersion: 1,
        app: { id: "ru.test.app", name: "Test", version: "1.0.0" },
        web: { root: "dist", entry: "index.html" },
        permissions: ["Internet"],
        plugins,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  fs.mkdirSync(path.join(dir, "dist"), { recursive: true });
  fs.writeFileSync(path.join(dir, "dist", "index.html"), "<html></html>", "utf8");
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("plugin manage", () => {
  it("listPlugins показывает версии built-in плагинов", () => {
    const monorepo = findMonorepoRoot();
    if (!monorepo) return;

    const dir = makeProject(["@aurobore/device", "@aurobore/echo"]);
    const entries = listPlugins(dir);
    expect(entries).toHaveLength(2);
    expect(entries[0]?.version).toBe("1.0.0");
    expect(entries.every((e) => e.status === "ok")).toBe(true);
  });

  it("addPlugin добавляет built-in без npm", () => {
    const monorepo = findMonorepoRoot();
    if (!monorepo) return;

    const dir = makeProject(["@aurobore/echo"]);
    const entry = addPlugin(dir, "network");
    expect(entry.name).toBe("network");
    expect(entry.source).toBe("built-in");
    expect(isBuiltinPlugin("network")).toBe(true);

    const config = JSON.parse(fs.readFileSync(path.join(dir, "aurobore.config.json"), "utf8"));
    expect(config.plugins).toContain("@aurobore/network");
  });

  it("removePlugin убирает плагин из config", () => {
    const monorepo = findMonorepoRoot();
    if (!monorepo) return;

    const dir = makeProject(["@aurobore/echo", "@aurobore/device"]);
    removePlugin(dir, "device", { keepNpm: true });
    const config = JSON.parse(fs.readFileSync(path.join(dir, "aurobore.config.json"), "utf8"));
    expect(config.plugins).toEqual(["@aurobore/echo"]);
  });
});

describe("plugin refresh", () => {
  it("refresh обновляет .desktop permissions после add", () => {
    const monorepo = findMonorepoRoot();
    if (!monorepo) return;

    const dir = makeProject(["@aurobore/echo"]);
    const { config } = loadConfig(dir);
    generateNativeProject({ projectRoot: dir, config, mode: "prod" });

    addPlugin(dir, "network");
    refreshNativePluginArtifacts(dir);

    const desktop = fs.readFileSync(
      path.join(dir, ".aurobore", "native", "ru.test.app.desktop"),
      "utf8",
    );
    expect(desktop).toContain("Permissions=Internet");
  });
});
