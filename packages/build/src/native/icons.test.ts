import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  AURORA_ICON_SIZES,
  checkProjectIcons,
  materializeIcons,
  resolveAppIcons,
} from "./icons.js";
import { generateCMakeLists, generateSpec } from "./generate.js";
import { resolveEffectiveConfig } from "../config/merge.js";
import type { AuroboreConfig } from "../config/types.js";

describe("icons", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("resolveAppIcons uses placeholder when no custom icon", async () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-icons-"));
    tempDirs.push(projectRoot);
    const stagingDir = path.join(projectRoot, "staging");
    const resolved = await resolveAppIcons({
      projectRoot,
      appId: "ru.example.testapp",
      stagingDir,
    });
    expect(resolved.source).toBe("placeholder");
    for (const size of AURORA_ICON_SIZES) {
      expect(fs.existsSync(resolved.bySize[size])).toBe(true);
    }
  });

  it("materializeIcons writes icons/<size>/<appId>.png", async () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-icons-"));
    const nativeDir = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-native-"));
    tempDirs.push(projectRoot, nativeDir);
    const resolved = await resolveAppIcons({
      projectRoot,
      appId: "ru.example.testapp",
      stagingDir: path.join(projectRoot, "staging"),
    });
    materializeIcons(nativeDir, "ru.example.testapp", resolved);
    for (const size of AURORA_ICON_SIZES) {
      const file = path.join(nativeDir, "icons", `${size}x${size}`, "ru.example.testapp.png");
      expect(fs.existsSync(file)).toBe(true);
    }
  });

  it("checkProjectIcons warns without custom icon", () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-icons-"));
    tempDirs.push(projectRoot);
    const result = checkProjectIcons(projectRoot, "ru.example.app");
    expect(result.level).toBe("warn");
  });

  it("checkProjectIcons ok when app.icon file exists", () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-icons-"));
    tempDirs.push(projectRoot);
    const iconPath = path.join(projectRoot, "resources", "icon.svg");
    fs.mkdirSync(path.dirname(iconPath), { recursive: true });
    fs.writeFileSync(iconPath, "<svg></svg>");
    const result = checkProjectIcons(projectRoot, "ru.example.app", "resources/icon.svg");
    expect(result.level).toBe("ok");
  });
});

describe("generateSpec / generateCMakeLists icons", () => {
  const baseConfig: AuroboreConfig = {
    configVersion: 1,
    app: { id: "ru.example.app", name: "App", version: "1.0.0" },
    web: { root: "dist", entry: "index.html" },
    permissions: ["Internet"],
    plugins: [],
  };

  it("generateSpec lists hicolor icon paths", () => {
    const effective = resolveEffectiveConfig(baseConfig, []);
    const spec = generateSpec("ru.example.app", effective);
    expect(spec).toContain("%{_datadir}/icons/hicolor/86x86/apps/%{name}.png");
    expect(spec).toContain("%{_datadir}/icons/hicolor/172x172/apps/%{name}.png");
  });

  it("generateCMakeLists installs icons for all sizes", () => {
    const cmake = generateCMakeLists("ru.example.app", "1.0.0", []);
    expect(cmake).toContain("set(AUROBORE_ICON_SIZES 86x86 108x108 128x128 172x172)");
    expect(cmake).toContain("share/icons/hicolor/${_icon_size}/apps");
  });
});
