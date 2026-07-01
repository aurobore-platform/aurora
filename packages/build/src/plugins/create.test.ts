import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createPluginScaffold,
  toDisplayName,
  toErrorCode,
  parseManifest,
} from "@aurobore/build";

describe("createPluginScaffold", () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("creates plugin skeleton in ./plugins/<name>/", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-plugin-"));
    const result = createPluginScaffold(tmpDir, "my-widget", { display: "My Widget" });

    expect(result.name).toBe("my-widget");
    expect(result.display).toBe("My Widget");
    expect(fs.existsSync(path.join(result.pluginDir, "plugin.manifest"))).toBe(true);
    expect(fs.existsSync(path.join(result.pluginDir, "native", "MyWidgetPlugin.cpp"))).toBe(true);
    expect(fs.existsSync(path.join(result.pluginDir, "generated", "index.js"))).toBe(true);

    const manifest = parseManifest(
      JSON.parse(fs.readFileSync(path.join(result.pluginDir, "plugin.manifest"), "utf8")),
    );
    expect(manifest.name).toBe("my-widget");
    expect(manifest.methods.ping).toBeDefined();
    expect(manifest.errors?.MY_WIDGET_UNAVAILABLE).toBeDefined();
  });

  it("rejects duplicate without --force", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-plugin-"));
    createPluginScaffold(tmpDir, "foo");
    expect(() => createPluginScaffold(tmpDir, "foo")).toThrow(/already exists/);
  });

  it("rejects built-in plugin names", () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-plugin-"));
    expect(() => createPluginScaffold(tmpDir, "echo")).toThrow(/built-in/);
  });
});

describe("plugin name helpers", () => {
  it("toDisplayName", () => {
    expect(toDisplayName("my-widget")).toBe("MyWidget");
  });

  it("toErrorCode", () => {
    expect(toErrorCode("my-widget")).toBe("MY_WIDGET_UNAVAILABLE");
  });
});
