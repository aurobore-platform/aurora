import { describe, expect, it } from "vitest";
import { pluginNameFromRef } from "./merge.js";
import { parseConfig, validateConfig } from "./parse.js";
import { resolveEffectiveConfig } from "./merge.js";
import type { PluginManifest } from "../manifest/types.js";

const validConfig = {
  configVersion: 1,
  app: {
    id: "ru.example.hello",
    name: "Hello",
    version: "1.0.0",
  },
  web: {
    root: "dist",
    entry: "index.html",
  },
  permissions: ["Internet"],
  plugins: ["@aurobore/device", "@aurobore/storage"],
};

describe("config parse", () => {
  it("принимает валидный конфиг", () => {
    expect(validateConfig(validConfig)).toEqual([]);
    const parsed = parseConfig(validConfig);
    expect(parsed.app.id).toBe("ru.example.hello");
    expect(parsed.web.root).toBe("dist");
    expect(parsed.build?.engine).toBe("chromium");
  });

  it("отклоняет unknown fields", () => {
    const errors = validateConfig({ ...validConfig, extra: true });
    expect(errors.some((e) => e.path === "extra")).toBe(true);
  });

  it("отклоняет неверный app.id", () => {
    const errors = validateConfig({
      ...validConfig,
      app: { ...validConfig.app, id: "invalid" },
    });
    expect(errors.some((e) => e.path === "app.id")).toBe(true);
  });

  it("отклоняет неподдерживаемый configVersion", () => {
    const errors = validateConfig({ ...validConfig, configVersion: 2 });
    expect(errors.some((e) => e.path === "configVersion")).toBe(true);
  });

  it("принимает cover.actions", () => {
    const errors = validateConfig({
      ...validConfig,
      cover: {
        actions: [{ id: "refresh", label: "Refresh", icon: "icon-m-sync" }],
      },
    });
    expect(errors).toEqual([]);
  });

  it("отклоняет слишком много cover.actions", () => {
    const errors = validateConfig({
      ...validConfig,
      cover: {
        actions: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
          { id: "c", label: "C" },
          { id: "d", label: "D" },
          { id: "e", label: "E" },
        ],
      },
    });
    expect(errors.some((e) => e.path === "cover.actions")).toBe(true);
  });
});

describe("config merge", () => {
  it("агрегирует permissions из манифестов", () => {
    const manifest: PluginManifest = {
      manifestVersion: 1,
      name: "camera",
      display: "Camera",
      version: "1.0.0",
      engineCompat: { runtime: ">=0.1.0", bridgeProtocol: 1 },
      permissions: ["Camera"],
      methods: { snap: { args: {}, result: "void" } },
    };
    const effective = resolveEffectiveConfig(parseConfig(validConfig), [manifest]);
    expect(effective.effectivePermissions).toContain("Internet");
    expect(effective.effectivePermissions).toContain("Camera");
  });

  it("извлекает имя плагина из npm-ref", () => {
    expect(pluginNameFromRef("@aurobore/device")).toBe("device");
    expect(pluginNameFromRef("echo")).toBe("echo");
  });
});
