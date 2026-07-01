import fs from "node:fs";
import path from "node:path";
import type { AuroboreConfig, EffectiveConfig } from "../config/types.js";
import { resolveEffectiveConfig } from "../config/merge.js";
import type { PluginManifest } from "../manifest/types.js";
import { runProjectCodegenFromConfig } from "../codegen/project.js";
import { resolvePluginRefs } from "../plugins/catalog.js";
import {
  resolveAppIcons,
  materializeIcons,
} from "./icons.js";
import { materializeTranslations, CMAKE_TRANSLATIONS_BLOCK, CMAKE_TRANSLATIONS_INSTALL } from "./translations.js";
import {
  resolvePluginNativeDir,
  resolveRuntimeRoot,
  type ResolveRuntimeRootOptions,
} from "./runtimePaths.js";

const SYNC_EXCLUDE = new Set(["RPMS", "CMakeFiles", ".sfdk", "generated"]);

export type { ResolveRuntimeRootOptions };
export { resolveRuntimeRoot, resolveBundledRuntimeRoot, resolvePluginNativeDir } from "./runtimePaths.js";
export { AURORA_ICON_SIZES, checkProjectIcons } from "./icons.js";
export type { IconCheckResult, ResolvedAppIcons } from "./icons.js";

export interface GenerateNativeProjectOptions {
  projectRoot: string;
  config: AuroboreConfig;
  mode?: "prod" | "dev";
  runtimeRoot?: string;
}

export interface GenerateNativeProjectResult {
  nativeDir: string;
  appId: string;
  manifests: PluginManifest[];
}

function copyDirFiltered(src: string, dst: string, excludeDirs: Set<string>): void {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (excludeDirs.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirFiltered(srcPath, dstPath, excludeDirs);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function copyWebAssets(projectRoot: string, config: AuroboreConfig, htmlDir: string): void {
  const webRoot = path.join(projectRoot, config.web.root);
  if (!fs.existsSync(webRoot)) {
    throw new Error(`web root not found: ${webRoot} (build your web app first)`);
  }
  fs.mkdirSync(htmlDir, { recursive: true });
  copyDirFiltered(webRoot, htmlDir, new Set());
}

function ensureBridgeScripts(runtimeRoot: string, htmlDir: string): void {
  const jsDir = path.join(htmlDir, "js");
  fs.mkdirSync(jsDir, { recursive: true });
  const containerJs = path.join(runtimeRoot, "container", "html", "js");
  for (const file of ["aurobore-bridge.js", "aurobore-bootstrap.js"]) {
    const src = path.join(containerJs, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(jsDir, file));
    }
  }
  const containerCss = path.join(runtimeRoot, "container", "html", "css", "aurobore-chrome.css");
  if (fs.existsSync(containerCss)) {
    const cssDir = path.join(htmlDir, "css");
    fs.mkdirSync(cssDir, { recursive: true });
    fs.copyFileSync(containerCss, path.join(cssDir, "aurobore-chrome.css"));
  }
}

const RPM_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const RPM_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Formats date for RPM %changelog (e.g. Mon Jun 28 2026). */
export function formatRpmChangelogDate(date: Date = new Date()): string {
  const day = RPM_WEEKDAYS[date.getUTCDay()] ?? "Mon";
  const month = RPM_MONTHS[date.getUTCMonth()] ?? "Jan";
  const dom = String(date.getUTCDate()).padStart(2, " ");
  const year = date.getUTCFullYear();
  return `${day} ${month} ${dom} ${year}`;
}

export function generateSpec(appId: string, effective: EffectiveConfig): string {
  const version = effective.app.version;
  const buildRequires = new Set([
    "cmake",
    "pkgconfig(auroraapp)",
    "pkgconfig(Qt5Core)",
    "pkgconfig(Qt5Gui)",
    "pkgconfig(Qt5Qml)",
    "pkgconfig(Qt5Quick)",
    "pkgconfig(aurorawebview)",
    "ru.auroraos.webview-devel",
  ]);
  const requires = new Set(["ru.auroraos.webview"]);

  for (const rpm of effective.nativeDeps.rpm) {
    if (rpm.includes("-devel") || rpm.startsWith("pkgconfig(")) {
      buildRequires.add(rpm);
    } else {
      requires.add(rpm);
    }
  }

  const buildRequiresLines = [...buildRequires].sort().map((r) => `BuildRequires:  ${r}`).join("\n");
  const requiresLines = [...requires].sort().map((r) => `Requires:       ${r}`).join("\n");

  return `Name:       ${appId}
Summary:    ${effective.app.name}
Version:    ${version}
Release:    1
License:    MIT
URL:        https://github.com/aurobore/aurobore
Source0:    %{name}-%{version}.tar.bz2

${buildRequiresLines}

${requiresLines}

%description
${effective.app.name} — Aurobore application.

%prep
%setup -q

%build
%cmake
%make_build

%install
%make_install

%files
%defattr(-,root,root,-)
%{_bindir}/%{name}
%{_datadir}/%{name}
%{_datadir}/applications/%{name}.desktop
%{_datadir}/icons/hicolor/86x86/apps/%{name}.png
%{_datadir}/icons/hicolor/108x108/apps/%{name}.png
%{_datadir}/icons/hicolor/128x128/apps/%{name}.png
%{_datadir}/icons/hicolor/172x172/apps/%{name}.png
%{_datadir}/%{name}/translations/*.qm

%changelog
* ${formatRpmChangelogDate()} Aurobore <aurobore@local> - ${version}-1
- Generated by aurobore build.
`;
}

export function generateDesktop(appId: string, effective: EffectiveConfig): string {
  const perms = effective.effectivePermissions.join(";");
  const orgParts = appId.split(".");
  const orgName = orgParts.length >= 2 ? orgParts.slice(0, -1).join(".") : appId;
  const appShort = orgParts[orgParts.length - 1] ?? appId;
  const schemes = effective.deepLinks?.schemes ?? [];
  const execLine = schemes.length > 0 ? `Exec=${appId} %u` : `Exec=${appId}`;

  const lines = [
    "[Desktop Entry]",
    "Type=Application",
    `Name=${effective.app.name}`,
    `Comment=${effective.app.name}`,
    `Icon=${appId}`,
    execLine,
    "X-Application-Type=silica-qt5",
  ];

  if (schemes.length > 0) {
    const mimeTypes = schemes.map((s) => `x-scheme-handler/${s}`).join(";");
    lines.push(`MimeType=${mimeTypes};`);
    lines.push("Intents=OpenURI");
  }

  lines.push(
    "",
    "[X-Application]",
    `Permissions=${perms}`,
    `OrganizationName=${orgName}`,
    `ApplicationName=${appShort}`,
  );

  if (schemes.length > 0) {
    lines.push(`Custom-Schemes=${schemes.join(";")}`);
  }

  return `${lines.join("\n")}\n`;
}

export function generateDefaultsJson(effective: EffectiveConfig, mode: "prod" | "dev"): string {
  const entry = effective.web.entry;
  const entryUrl =
    mode === "dev" && effective.web.entryUrl
      ? effective.web.entryUrl
      : `aurobore-app://localhost/${entry.replace(/^\//, "")}`;

  const defaults: Record<string, unknown> = {
    configVersion: effective.configVersion,
    app: {
      id: effective.app.id,
      name: effective.app.name,
      version: effective.app.version,
      orientation: effective.app.orientation ?? "portrait",
      splash: effective.app.splash ?? {
        background: "#1a1a2e",
        timeoutMs: 10000,
      },
    },
    web: {
      root: "html",
      entry,
      entryUrl,
    },
    permissions: effective.effectivePermissions,
    build: effective.build,
  };

  if (effective.deepLinks?.schemes?.length) {
    defaults.deepLinks = { schemes: effective.deepLinks.schemes };
  }
  if (effective.cover) {
    defaults.cover = effective.cover;
  }

  return `${JSON.stringify(defaults, null, 2)}\n`;
}

/** Источники native-sdk в app CMake — паритет с runtime/container/CMakeLists.txt */
export const NATIVE_SDK_SOURCES = [
  "IPlugin.cpp",
  "PluginManager.cpp",
  "ResourceRef.cpp",
  "ScopeValidator.cpp",
  "StreamPublisher.cpp",
] as const;

export function generateCMakeLists(
  appId: string,
  version: string,
  manifests: PluginManifest[],
): string {
  const pluginSources = manifests
    .map(
      (m) =>
        `    \${PLUGIN_NATIVE_DIR}/${m.name}/native/${m.display}Plugin.cpp`,
    )
    .join("\n");
  const pluginIncludes = manifests
    .map((m) => `    \${PLUGIN_NATIVE_DIR}/${m.name}/native`)
    .join("\n");

  const nativeSdkSources = NATIVE_SDK_SOURCES.map(
    (file) => `    \${NATIVE_SDK_DIR}/${file}`,
  ).join("\n");

  return `cmake_minimum_required(VERSION 3.5)

project(${appId} VERSION ${version} LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_INCLUDE_CURRENT_DIR ON)

set(CMAKE_INSTALL_RPATH "$ORIGIN/../lib/cef")
set(CMAKE_BUILD_WITH_INSTALL_RPATH TRUE)

find_package(Qt5 COMPONENTS Core Gui Qml Quick Network LinguistTools REQUIRED)
find_package(PkgConfig REQUIRED)

pkg_check_modules(Auroraapp auroraapp REQUIRED IMPORTED_TARGET)
pkg_check_modules(AuroraWebView aurorawebview REQUIRED IMPORTED_TARGET)

${CMAKE_TRANSLATIONS_BLOCK}

set(PLUGIN_NATIVE_DIR \${CMAKE_CURRENT_SOURCE_DIR}/../plugins)
set(NATIVE_SDK_DIR \${CMAKE_CURRENT_SOURCE_DIR}/../native-sdk)
set(BRIDGE_NATIVE_DIR \${CMAKE_CURRENT_SOURCE_DIR}/../bridge-native)

add_executable(\${PROJECT_NAME}
    src/main.cpp
    src/AppConfig.cpp
    src/AssetResolver.cpp
    src/AssetSchemeServer.cpp
    src/LoopbackTlsCredentials.cpp
    src/LifecycleBridge.cpp
    src/DeepLinkHandler.cpp
    src/CoverBridge.cpp
    src/CoverPlugin.cpp
    generated/PluginRegistry.cpp
    \${BRIDGE_NATIVE_DIR}/BridgeRouter.cpp
${nativeSdkSources}
${pluginSources}
    \${QmFiles}
)

target_include_directories(\${PROJECT_NAME} PRIVATE
    \${CMAKE_CURRENT_SOURCE_DIR}/generated
    \${BRIDGE_NATIVE_DIR}
    \${NATIVE_SDK_DIR}
${pluginIncludes}
)

target_link_libraries(\${PROJECT_NAME}
    PRIVATE
        Qt5::Core
        Qt5::Gui
        Qt5::Qml
        Qt5::Quick
        Qt5::Network
        PkgConfig::Auroraapp
        PkgConfig::AuroraWebView
)

install(TARGETS \${PROJECT_NAME} RUNTIME DESTINATION bin)
install(DIRECTORY html DESTINATION share/\${PROJECT_NAME})
install(DIRECTORY qml DESTINATION share/\${PROJECT_NAME})
install(DIRECTORY config DESTINATION share/\${PROJECT_NAME})
install(DIRECTORY tls DESTINATION share/\${PROJECT_NAME})
install(FILES \${PROJECT_NAME}.desktop DESTINATION share/applications)

set(AUROBORE_ICON_SIZES 86x86 108x108 128x128 172x172)
foreach(_icon_size IN LISTS AUROBORE_ICON_SIZES)
    install(FILES icons/\${_icon_size}/\${PROJECT_NAME}.png
        DESTINATION share/icons/hicolor/\${_icon_size}/apps)
endforeach()

${CMAKE_TRANSLATIONS_INSTALL}
`;
}

function renameContainerArtifacts(nativeDir: string, appId: string): void {
  const oldDesktop = path.join(nativeDir, "ru.auroraos.aurobore-container.desktop");
  const newDesktop = path.join(nativeDir, `${appId}.desktop`);
  if (fs.existsSync(oldDesktop)) {
    fs.renameSync(oldDesktop, newDesktop);
  }

  const oldQml = path.join(nativeDir, "qml", "ru.auroraos.aurobore-container.qml");
  const newQml = path.join(nativeDir, "qml", `${appId}.qml`);
  if (fs.existsSync(oldQml)) {
    fs.renameSync(oldQml, newQml);
  }

  const oldSpecDir = path.join(nativeDir, "rpm");
  if (fs.existsSync(oldSpecDir)) {
    for (const f of fs.readdirSync(oldSpecDir)) {
      if (f.endsWith(".spec")) fs.unlinkSync(path.join(oldSpecDir, f));
    }
  }
}

/** Генерирует нативный проект в .aurobore/native/. */
export async function generateNativeProject(
  options: GenerateNativeProjectOptions,
): Promise<GenerateNativeProjectResult> {
  const { projectRoot, config, mode = "prod" } = options;
  const runtimeRoot = resolveRuntimeRoot({
    explicit: options.runtimeRoot,
    projectRoot,
  });
  const containerSrc = path.join(runtimeRoot, "container");
  const nativeDir = path.join(projectRoot, ".aurobore", "native");
  const pluginsForCodegen = resolvePluginRefs(config.plugins);

  if (fs.existsSync(nativeDir)) {
    fs.rmSync(nativeDir, { recursive: true, force: true });
  }

  copyDirFiltered(containerSrc, nativeDir, SYNC_EXCLUDE);

  if (mode === "prod") {
    const htmlDir = path.join(nativeDir, "html");
    if (fs.existsSync(htmlDir)) fs.rmSync(htmlDir, { recursive: true, force: true });
    copyWebAssets(projectRoot, config, htmlDir);
  }
  ensureBridgeScripts(runtimeRoot, path.join(nativeDir, "html"));

  const { manifests } = runProjectCodegenFromConfig(projectRoot, pluginsForCodegen);
  const effective = resolveEffectiveConfig(config, manifests);
  const appId = effective.app.id;
  const pluginNames = manifests.map((m) => m.name);

  renameContainerArtifacts(nativeDir, appId);

  const iconsStaging = path.join(projectRoot, ".aurobore", "icon-staging");
  try {
    const resolvedIcons = await resolveAppIcons({
      projectRoot,
      appId,
      appIcon: effective.app.icon,
      stagingDir: iconsStaging,
    });
    materializeIcons(nativeDir, appId, resolvedIcons);
  } catch (err) {
    throw new Error(
      `Failed to prepare app icons: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    if (fs.existsSync(iconsStaging)) {
      fs.rmSync(iconsStaging, { recursive: true, force: true });
    }
  }

  materializeTranslations(nativeDir, appId, effective.app.name);

  fs.mkdirSync(path.join(nativeDir, "rpm"), { recursive: true });
  fs.writeFileSync(path.join(nativeDir, "rpm", `${appId}.spec`), generateSpec(appId, effective), "utf8");
  fs.writeFileSync(path.join(nativeDir, `${appId}.desktop`), generateDesktop(appId, effective), "utf8");
  fs.writeFileSync(
    path.join(nativeDir, "config", "defaults.json"),
    generateDefaultsJson(effective, mode),
    "utf8",
  );
  fs.writeFileSync(
    path.join(nativeDir, "CMakeLists.txt"),
    generateCMakeLists(appId, effective.app.version, manifests),
    "utf8",
  );

  const meta = {
    appId,
    version: effective.app.version,
    plugins: pluginNames,
    generatedAt: new Date().toISOString(),
    mode,
  };
  fs.mkdirSync(path.join(projectRoot, ".aurobore"), { recursive: true });
  fs.writeFileSync(
    path.join(projectRoot, ".aurobore", "build-meta.json"),
    `${JSON.stringify(meta, null, 2)}\n`,
    "utf8",
  );

  return { nativeDir, appId, manifests };
}

/** Синхронизирует siblings (bridge-native, native-sdk, plugins) рядом со staging. */
export function syncRuntimeSiblings(
  stagingDir: string,
  pluginNames: string[],
  runtimeRoot?: string,
  projectRoot?: string,
): void {
  const runtime = resolveRuntimeRoot({
    explicit: runtimeRoot,
    projectRoot,
  });
  const stagingParent = path.dirname(stagingDir);

  copyDirFiltered(path.join(runtime, "bridge-native"), path.join(stagingParent, "bridge-native"), new Set());
  copyDirFiltered(path.join(runtime, "native-sdk"), path.join(stagingParent, "native-sdk"), new Set());

  if (pluginNames.length === 0) {
    return;
  }

  const pluginsDst = path.join(stagingParent, "plugins");
  if (fs.existsSync(pluginsDst)) fs.rmSync(pluginsDst, { recursive: true, force: true });
  fs.mkdirSync(pluginsDst, { recursive: true });

  const root = projectRoot ?? process.cwd();

  for (const name of pluginNames) {
    const pluginSrc = resolvePluginNativeDir(root, name);
    if (!pluginSrc) {
      throw new Error(
        `native plugin sources not found: ${name} (install @aurobore/${name} or set AUROBORE_PLUGINS_ROOT)`,
      );
    }
    copyDirFiltered(pluginSrc, path.join(pluginsDst, name), new Set(["generated", "node_modules"]));
  }
}
