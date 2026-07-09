import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  copyDirFiltered,
  formatRpmChangelogDate,
  generateDesktop,
  generateDefaultsJson,
  generateNativeProject,
  generateSpec,
  SYNC_EXCLUDE,
} from "./generate.js";
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

const tempDirs: string[] = [];

function makeTempProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-gen-project-"));
  tempDirs.push(dir);
  fs.writeFileSync(
    path.join(dir, "aurobore.config.json"),
    `${JSON.stringify(
      {
        configVersion: 1,
        app: { id: "ru.example.demo", name: "Demo App", version: "1.0.0" },
        web: { root: "dist", entry: "index.html" },
        permissions: ["Internet"],
        plugins: ["@aurobore/echo"],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  fs.mkdirSync(path.join(dir, "dist"), { recursive: true });
  fs.writeFileSync(path.join(dir, "dist", "index.html"), "<!doctype html><title>demo</title>", "utf8");
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("native generate templates", () => {
  it("генерирует .spec с app id и версией", () => {
    const effective = resolveEffectiveConfig(config, [manifest]);
    const spec = generateSpec("ru.example.demo", effective);
    expect(spec).toContain("Name:       ru.example.demo");
    expect(spec).toContain("Version:    1.0.0");
    expect(spec).toContain("pkgconfig(aurorawebview)");
    expect(spec).toContain("%global webview_launcher");
    expect(spec).toContain("%global cryptopro_checker");
    expect(spec).toContain("-DWEBVIEW_SUBPROCESS_LAUNCHER_INSTALL_PATH=%{webview_launcher}");
    expect(spec).toContain(".webview-subprocess");
    expect(spec).toContain("ru.auroraos.webview-cryptopro-checker");
    expect(spec).toContain("cp -a %{_libexecdir}/ru.auroraos.webview-cryptopro-checker");
    expect(spec).toContain("pkgconfig(qca2-qt5)");
  });

  it("генерирует .desktop с permissions", () => {
    const effective = resolveEffectiveConfig(config, [manifest]);
    const desktop = generateDesktop("ru.example.demo", effective);
    expect(desktop).toContain("Name=Demo App");
    expect(desktop).toContain("Permissions=DeviceInfo;Internet");
    expect(desktop).toContain("Exec=ru.example.demo");
    expect(desktop).toContain("X-Nemo-Application-Type=silica-qt5");
    expect(desktop).toContain("[X-Aurora-Application]");
    expect(desktop).toContain("Orientation=Portrait");
  });

  it("генерирует .desktop с splash gradient и iconMode", () => {
    const withUi = parseConfig({
      configVersion: 1,
      app: {
        id: "ru.example.demo",
        name: "Demo",
        version: "1.0.0",
        orientation: "auto",
        iconMode: "Crop",
        splash: { background: "#112233", gradientEnd: "#AABBCC" },
      },
      web: { root: "dist", entry: "index.html" },
    });
    const effective = resolveEffectiveConfig(withUi, [manifest]);
    const desktop = generateDesktop("ru.example.demo", effective);
    expect(desktop).toContain("[X-Aurora-SplashScreen]");
    expect(desktop).toContain("GradientStartColor=#112233");
    expect(desktop).toContain("GradientEndColor=#AABBCC");
    expect(desktop).toContain("Orientation=All");
    expect(desktop).toContain("IconMode=Crop");
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
        mode: "preview",
        actions: [{ id: "refresh", label: "Refresh", icon: "icon-m-sync" }],
      },
    });
    const effective = resolveEffectiveConfig(withCover, [manifest]);
    const json = JSON.parse(generateDefaultsJson(effective, "prod"));
    expect(json.cover).toEqual({
      mode: "preview",
      actions: [{ id: "refresh", label: "Refresh", icon: "icon-m-sync" }],
    });
  });

  it("генерирует defaults.json с web.allowedOrigins", () => {
    const withOrigins = parseConfig({
      configVersion: 1,
      app: { id: "ru.example.demo", name: "Demo", version: "1.0.0" },
      web: {
        root: "dist",
        entry: "index.html",
        allowedOrigins: ["https://example.com"],
      },
      permissions: ["Internet"],
    });
    const effective = resolveEffectiveConfig(withOrigins, [manifest]);
    const json = JSON.parse(generateDefaultsJson(effective, "prod"));
    expect(json.web.allowedOrigins).toEqual(["https://example.com"]);
  });

  it("генерирует пустой allowedOrigins без поля в конфиге", () => {
    const effective = resolveEffectiveConfig(config, [manifest]);
    const json = JSON.parse(generateDefaultsJson(effective, "prod"));
    expect(json.web.allowedOrigins).toEqual([]);
  });

  it("formatRpmChangelogDate в формате rpm", () => {
    const date = formatRpmChangelogDate(new Date(Date.UTC(2026, 5, 28, 12, 0, 0)));
    expect(date).toBe("Sun Jun 28 2026");
    const spec = generateSpec("ru.example.demo", resolveEffectiveConfig(config, [manifest]));
    expect(spec).toMatch(/\* \w{3} \w{3}\s+\d{1,2} \d{4} Aurobore <aurobore@local> - 1\.0\.0-1/);
    expect(spec).not.toContain("GMT");
  });

  it("исключает qml/verification при sync container → native", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-gen-"));
    const src = path.join(tmp, "src");
    fs.mkdirSync(path.join(src, "qml", "verification"), { recursive: true });
    fs.writeFileSync(path.join(src, "qml", "verification", "Harness.qml"), "");
    fs.mkdirSync(path.join(src, "qml", "pages"), { recursive: true });
    fs.writeFileSync(path.join(src, "qml", "pages", "Page.qml"), "");
    const dst = path.join(tmp, "dst");
    copyDirFiltered(src, dst, SYNC_EXCLUDE);
    expect(fs.existsSync(path.join(dst, "qml", "verification"))).toBe(false);
    expect(fs.existsSync(path.join(dst, "qml", "pages", "Page.qml"))).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("generateNativeProject исключает qml/verification из .aurobore/native", async () => {
    const projectRoot = makeTempProject();
    const { nativeDir } = await generateNativeProject({
      projectRoot,
      config: parseConfig(JSON.parse(fs.readFileSync(path.join(projectRoot, "aurobore.config.json"), "utf8"))),
      mode: "prod",
    });
    expect(fs.existsSync(path.join(nativeDir, "qml", "verification"))).toBe(false);
    expect(fs.existsSync(path.join(nativeDir, "qml", "pages", "WebAppPage.qml"))).toBe(true);
  });
});
