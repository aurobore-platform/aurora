import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { collectQtComponents, generateCMakeLists, NATIVE_SDK_SOURCES } from "./generate.js";
import type { PluginManifest } from "../manifest/types.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "../../../..");
const CONTAINER_CMAKE = path.join(REPO_ROOT, "runtime", "container", "CMakeLists.txt");
const NATIVE_SDK_DIR = path.join(REPO_ROOT, "runtime", "native-sdk");
const GEO_MANIFEST_PATH = path.join(REPO_ROOT, "plugins", "geolocation", "plugin.manifest");
const SENSORS_MANIFEST_PATH = path.join(REPO_ROOT, "plugins", "sensors", "plugin.manifest");
const CAMERA_MANIFEST_PATH = path.join(REPO_ROOT, "plugins", "camera", "plugin.manifest");

function parseContainerNativeSdkSources(cmakeText: string): string[] {
  const re = /\$\{NATIVE_SDK_DIR\}\/([A-Za-z0-9_]+\.cpp)/g;
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = re.exec(cmakeText)) !== null) {
    found.add(match[1]!);
  }
  return [...found].sort();
}

function loadManifest(filePath: string): PluginManifest {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as PluginManifest;
}

describe("generateCMakeLists native-sdk parity", () => {
  it("NATIVE_SDK_SOURCES совпадает с .cpp в runtime/native-sdk", () => {
    const onDisk = fs
      .readdirSync(NATIVE_SDK_DIR)
      .filter((f) => f.endsWith(".cpp"))
      .sort();
    expect([...NATIVE_SDK_SOURCES].sort()).toEqual(onDisk);
  });

  it("generateCMakeLists включает все NATIVE_SDK_SOURCES", () => {
    const cmake = generateCMakeLists("ru.example.app", "1.0.0", []);
    for (const file of NATIVE_SDK_SOURCES) {
      expect(cmake).toContain(`\${NATIVE_SDK_DIR}/${file}`);
    }
  });

  it("generateCMakeLists паритет с runtime/container/CMakeLists.txt", () => {
    const containerSources = parseContainerNativeSdkSources(
      fs.readFileSync(CONTAINER_CMAKE, "utf8"),
    );
    const cmake = generateCMakeLists("ru.example.app", "1.0.0", []);
    for (const file of containerSources) {
      expect(cmake).toContain(`\${NATIVE_SDK_DIR}/${file}`);
    }
    expect(containerSources).toEqual([...NATIVE_SDK_SOURCES].sort());
  });

  it("generateCMakeLists включает webview subprocess (W2)", () => {
    const cmake = generateCMakeLists("ru.example.app", "1.0.0", []);
    expect(cmake).toContain("find_package(aurora_libaurorawebview QUIET)");
    expect(cmake).toContain("pkgconfig(aurorawebview)");
    expect(cmake).toContain("WEBVIEW_SUBPROCESS_LAUNCHER_INSTALL_PATH");
    expect(cmake).toContain("webview_subprocess_main.cpp");
    expect(cmake).toContain("${AUROBORE_WEBVIEW_TARGET}");
    expect(cmake).toContain("CEF_LINK_PROPERTY");
    expect(cmake).toContain('INSTALL_RPATH "$ORIGIN/../../lib/cef"');
    expect(cmake).toContain(".webview-subprocess");
  });

  it("generateCMakeLists включает QCA (W3)", () => {
    const cmake = generateCMakeLists("ru.example.app", "1.0.0", []);
    expect(cmake).toContain("pkg_check_modules(qca2-qt5 REQUIRED IMPORTED_TARGET qca2-qt5)");
    expect(cmake).toContain("PkgConfig::qca2-qt5");
  });
});

describe("generateCMakeLists nativeDeps.qt", () => {
  it("добавляет Qt5::Positioning для geolocation", () => {
    const cmake = generateCMakeLists("ru.example.app", "1.0.0", [
      loadManifest(GEO_MANIFEST_PATH),
    ]);
    expect(cmake).toContain("find_package(Qt5 COMPONENTS Core Gui Qml Quick Network Multimedia Positioning LinguistTools REQUIRED)");
    expect(cmake).toContain("Qt5::Positioning");
    expect(cmake).toContain("GeolocationMapping.cpp");
  });

  it("добавляет Qt5::Sensors для sensors", () => {
    const cmake = generateCMakeLists("ru.example.app", "1.0.0", [
      loadManifest(SENSORS_MANIFEST_PATH),
    ]);
    expect(cmake).toContain("Sensors");
    expect(cmake).toContain("Qt5::Sensors");
    expect(cmake).toContain("SensorsMapping.cpp");
  });

  it("добавляет Multimedia и Positioning для camera+geolocation", () => {
    const cmake = generateCMakeLists("ru.example.app", "1.0.0", [
      loadManifest(CAMERA_MANIFEST_PATH),
      loadManifest(GEO_MANIFEST_PATH),
    ]);
    expect(cmake).toContain("Multimedia");
    expect(cmake).toContain("Positioning");
    expect(cmake).toContain("Qt5::Multimedia");
    expect(cmake).toContain("Qt5::Positioning");
    expect(cmake).not.toContain("Qt5::LinguistTools");
  });

  it("добавляет Qt5::DBus и nemonotifications для notifications", () => {
    const notificationsManifest = JSON.parse(
      fs.readFileSync(
        path.join(REPO_ROOT, "plugins", "notifications", "plugin.manifest"),
        "utf8",
      ),
    ) as PluginManifest;
    const cmake = generateCMakeLists("ru.example.app", "1.0.0", [notificationsManifest]);
    expect(cmake).toContain("Qt5::DBus");
    expect(cmake).toContain("nemonotifications-qt5");
    expect(cmake).toContain("NotificationsBridge.cpp");
    expect(cmake).toContain("PkgConfig::nemonotificationsqt5");
  });

  it("collectQtComponents не дублирует базовые компоненты", () => {
    const components = collectQtComponents([loadManifest(GEO_MANIFEST_PATH)]);
    expect(components.filter((c) => c === "Core")).toHaveLength(1);
    expect(components).toContain("Positioning");
  });
});
