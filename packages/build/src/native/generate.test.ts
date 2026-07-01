import { describe, expect, it } from "vitest";
import { formatRpmChangelogDate, generateDesktop, generateDefaultsJson, generateSpec } from "./generate.js";
import { parseConfig } from "../config/parse.js";
import { resolveEffectiveConfig } from "../config/merge.js";
import type { PluginManifest } from "../manifest/types.js";

const config = parseConfig({
  configVersion: 1,
  app: { id: "ru.example.demo", name: "Demo App", version: "1.0.0" },
  web: { root: "dist", entry: "index.html" },
  permissions: ["Internet"],
  plugins: ["@aurobore/device"],
});

const manifest: PluginManifest = {
  manifestVersion: 1,
  name: "device",
  display: "Device",
  version: "1.0.0",
  engineCompat: { runtime: ">=0.1.0", bridgeProtocol: 1 },
  permissions: ["DeviceInfo"],
  methods: { getInfo: { args: {}, result: "void" } },
};

describe("native generate templates", () => {
  it("генерирует .spec с app id и версией", () => {
    const effective = resolveEffectiveConfig(config, [manifest]);
    const spec = generateSpec("ru.example.demo", effective);
    expect(spec).toContain("Name:       ru.example.demo");
    expect(spec).toContain("Version:    1.0.0");
    expect(spec).toContain("pkgconfig(aurorawebview)");
  });

  it("генерирует .desktop с permissions", () => {
    const effective = resolveEffectiveConfig(config, [manifest]);
    const desktop = generateDesktop("ru.example.demo", effective);
    expect(desktop).toContain("Name=Demo App");
    expect(desktop).toContain("Permissions=DeviceInfo;Internet");
    expect(desktop).toContain("Exec=ru.example.demo");
  });

  it("генерирует .desktop с deep link schemes", () => {
    const withLinks = parseConfig({
      ...config,
      deepLinks: { schemes: ["myapp", "demo"] },
    });
    const effective = resolveEffectiveConfig(withLinks, [manifest]);
    const desktop = generateDesktop("ru.example.demo", effective);
    expect(desktop).toContain("Exec=ru.example.demo %u");
    expect(desktop).toContain("MimeType=x-scheme-handler/myapp;x-scheme-handler/demo;");
    expect(desktop).toContain("Intents=OpenURI");
    expect(desktop).toContain("Custom-Schemes=myapp;demo");
  });

  it("генерирует defaults.json с cover.actions", () => {
    const withCover = parseConfig({
      configVersion: 1,
      app: { id: "ru.example.demo", name: "Demo", version: "1.0.0" },
      web: { root: "dist", entry: "index.html" },
      cover: {
        actions: [{ id: "refresh", label: "Refresh", icon: "icon-m-sync" }],
      },
    });
    const effective = resolveEffectiveConfig(withCover, [manifest]);
    const json = JSON.parse(generateDefaultsJson(effective, "prod"));
    expect(json.cover).toEqual({
      actions: [{ id: "refresh", label: "Refresh", icon: "icon-m-sync" }],
    });
  });

  it("formatRpmChangelogDate в формате rpm", () => {
    const date = formatRpmChangelogDate(new Date(Date.UTC(2026, 5, 28, 12, 0, 0)));
    expect(date).toBe("Sun Jun 28 2026");
    const spec = generateSpec("ru.example.demo", resolveEffectiveConfig(config, [manifest]));
    expect(spec).toMatch(/\* \w{3} \w{3}\s+\d{1,2} \d{4} Aurobore <aurobore@local> - 1\.0\.0-1/);
    expect(spec).not.toContain("GMT");
  });
});
