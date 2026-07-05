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
const SYNC_EXCLUDE_PATHS = new Set(["qml/verification"]);

export { copyDirFiltered, SYNC_EXCLUDE, SYNC_EXCLUDE_PATHS };

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

function copyDirFiltered(
  src: string,
  dst: string,
  excludeDirs: Set<string>,
  excludePaths: Set<string> = SYNC_EXCLUDE_PATHS,
  relativePath = "",
): void {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (excludeDirs.has(entry.name)) continue;
    const childRelative = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    if (excludePaths.has(childRelative)) continue;
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirFiltered(srcPath, dstPath, excludeDirs, excludePaths, childRelative);
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

/** RPM globals and install steps for webview-subprocess + cryptopro-checker (W2). */
export const WEBVIEW_RPM_GLOBALS = `%global webview_launcher %{_libexecdir}/%{name}/%{name}.webview-subprocess
%global cryptopro_checker %{_libexecdir}/%{name}/ru.auroraos.webview-cryptopro-checker`;

export const WEBVIEW_RPM_BUILD = `%cmake -DWEBVIEW_SUBPROCESS_LAUNCHER_INSTALL_PATH=%{webview_launcher} \\
       -DWEBVIEW_CRYPTOPRO_CHECKER_INSTALL_PATH=%{cryptopro_checker}`;

export const WEBVIEW_RPM_INSTALL = `%make_install
mkdir -p %{buildroot}/%{_libexecdir}/%{name} && \\
  mv %{buildroot}%{_bindir}/%{name}.webview-subprocess %{buildroot}/%{webview_launcher} && \\
  chmod +x %{buildroot}/%{webview_launcher} && \\
  if test -f %{buildroot}%{_libexecdir}/ru.auroraos.webview-cryptopro-checker; then \\
    mv %{buildroot}%{_libexecdir}/ru.auroraos.webview-cryptopro-checker %{buildroot}/%{cryptopro_checker}; \\
  else \\
    cp -a %{_libexecdir}/ru.auroraos.webview-cryptopro-checker %{buildroot}/%{cryptopro_checker}; \\
  fi && \\
  chmod +x %{buildroot}/%{cryptopro_checker}`;

export const WEBVIEW_RPM_FILES = `%{webview_launcher}
%{cryptopro_checker}`;

/** QCA init for WebView TLS (W3) — pkg-config name on SDK 5.2.1: qca2-qt5. */
export const RPM_BUILDREQUIRES_QCA = "pkgconfig(qca2-qt5)";

export const CMAKE_QCA_BLOCK = `pkg_check_modules(qca2-qt5 REQUIRED IMPORTED_TARGET qca2-qt5)`;

/** Shared CMake blocks for webview subprocess packaging (W2). */
export const CMAKE_WEBVIEW_SUBPROCESS_BLOCK = `find_package(aurora_libaurorawebview QUIET)

if(aurora_libaurorawebview_FOUND)
    get_property(CEF_LIBS_PATH GLOBAL PROPERTY aurora_libcef_PROPERTY_LIBS_PATH)
    get_property(WEBVIEW_LIBS_PATH GLOBAL PROPERTY aurora_libaurorawebview_PROPERTY_LIBS_PATH)
    set_property(GLOBAL PROPERTY CEF_LINK_PROPERTY
        "-L\${WEBVIEW_LIBS_PATH}" "-laurorawebview" "-Wl,--no-as-needed"
        \${CEF_LIBS_PATH}/libcef.so "-Wl,--as-needed")
    set(AUROBORE_WEBVIEW_TARGET aurora_libaurorawebview::aurora_libaurorawebview)
else()
    message(STATUS "aurora_libaurorawebview not found; using pkgconfig(aurorawebview)")
    set(AUROBORE_WEBVIEW_TARGET PkgConfig::AuroraWebView)
endif()

pkg_check_modules(AuroraWebView aurorawebview REQUIRED IMPORTED_TARGET)

if(NOT WEBVIEW_SUBPROCESS_LAUNCHER_INSTALL_PATH)
    message(FATAL_ERROR "WEBVIEW_SUBPROCESS_LAUNCHER_INSTALL_PATH is required")
endif()
if(NOT WEBVIEW_CRYPTOPRO_CHECKER_INSTALL_PATH)
    message(FATAL_ERROR "WEBVIEW_CRYPTOPRO_CHECKER_INSTALL_PATH is required")
endif()
add_compile_definitions(
    WEBVIEW_SUBPROCESS_LAUNCHER_INSTALL_PATH="\${WEBVIEW_SUBPROCESS_LAUNCHER_INSTALL_PATH}"
    WEBVIEW_CRYPTOPRO_CHECKER_INSTALL_PATH="\${WEBVIEW_CRYPTOPRO_CHECKER_INSTALL_PATH}")

include(CheckCXXSourceCompiles)
set(CMAKE_REQUIRED_INCLUDES \${AuroraWebView_INCLUDE_DIRS})
set(CMAKE_REQUIRED_LIBRARIES \${AuroraWebView_LINK_LIBRARIES})
check_cxx_source_compiles([=[
#include <aurorawebview/webenginecontext.h>
int main(int argc, char **argv) {
  return Aurora::WebView::WebEngineContext::StartSubprocess(argc, argv);
}
]=] AUROBORE_WEBVIEW_HAS_START_SUBPROCESS)
if(AUROBORE_WEBVIEW_HAS_START_SUBPROCESS)
    add_compile_definitions(AUROBORE_WEBVIEW_HAS_START_SUBPROCESS)
endif()`;

export const CMAKE_WEBVIEW_SUBPROCESS_TARGET = `get_property(CEF_LINK_PROPERTY GLOBAL PROPERTY CEF_LINK_PROPERTY)
if(CEF_LINK_PROPERTY)
    target_link_options(\${PROJECT_NAME} PRIVATE \${CEF_LINK_PROPERTY})
endif()

set(SUBPROCESS_NAME \${PROJECT_NAME}.webview-subprocess)
add_executable(\${SUBPROCESS_NAME} src/webview_subprocess_main.cpp)
target_link_options(\${SUBPROCESS_NAME} PRIVATE "-Wl,--no-as-needed")
target_link_libraries(\${SUBPROCESS_NAME} PRIVATE
    \${AUROBORE_WEBVIEW_TARGET}
    Qt5::Core
)
set_target_properties(\${SUBPROCESS_NAME} PROPERTIES INSTALL_RPATH "$ORIGIN/../../lib/cef")

install(TARGETS \${SUBPROCESS_NAME} RUNTIME DESTINATION bin)`;

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
    RPM_BUILDREQUIRES_QCA,
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

${WEBVIEW_RPM_GLOBALS}

%description
${effective.app.name} — Aurobore application.

%prep
%setup -q

%build
${WEBVIEW_RPM_BUILD}
%make_build

%install
${WEBVIEW_RPM_INSTALL}

%files
%defattr(-,root,root,-)
%{_bindir}/%{name}
${WEBVIEW_RPM_FILES}
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
      allowedOrigins: effective.web.allowedOrigins ?? [],
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

/** Базовые Qt-компоненты контейнера (без plugin-specific nativeDeps.qt). */
export const BASE_QT_COMPONENTS = [
  "Core",
  "Gui",
  "Qml",
  "Quick",
  "Network",
] as const;

/** Только для find_package (не линковать как Qt5::LinguistTools). */
export const BASE_QT_BUILD_COMPONENTS = ["LinguistTools"] as const;

/** Доп. .cpp помимо *Plugin.cpp (паритет с runtime/container/CMakeLists.txt). */
const EXTRA_PLUGIN_NATIVE_SOURCES: Record<string, string[]> = {
  geolocation: ["GeolocationMapping.cpp"],
  sensors: ["SensorsMapping.cpp"],
  notifications: ["NotificationsBridge.cpp"],
};

/** pkgconfig-модули плагинов (не покрываются nativeDeps.qt). */
const PLUGIN_PKGCONFIG_MODULES: Record<string, string> = {
  notifications: "nemonotifications-qt5",
};

function hasPluginPkgConfig(manifests: PluginManifest[]): boolean {
  return manifests.some((m) => PLUGIN_PKGCONFIG_MODULES[m.name] !== undefined);
}

function pluginPkgConfigCmakeBlock(manifests: PluginManifest[]): string {
  const modules = new Set<string>();
  for (const manifest of manifests) {
    const mod = PLUGIN_PKGCONFIG_MODULES[manifest.name];
    if (mod)
      modules.add(mod);
  }
  if (modules.size === 0)
    return "";
  const checks = [...modules]
    .sort((a, b) => a.localeCompare(b))
    .map((mod) => {
      const varName = mod.replace(/[^a-zA-Z0-9]/g, "");
      return `pkg_check_modules(${varName} ${mod} REQUIRED IMPORTED_TARGET)`;
    })
    .join("\n");
  const links = [...modules]
    .sort((a, b) => a.localeCompare(b))
    .map((mod) => {
      const varName = mod.replace(/[^a-zA-Z0-9]/g, "");
      return `        PkgConfig::${varName}`;
    })
    .join("\n");
  return `${checks}

`;
}

/** main.cpp контейнера всегда использует CameraBridge (см. runtime/container/src/main.cpp). */
const ALWAYS_SYNC_PLUGINS = ["camera"] as const;

const ALWAYS_PLUGIN_NATIVE_SOURCES = [
  "camera/native/CameraBridge.cpp",
  "camera/native/CameraPlugin.cpp",
] as const;

const ALWAYS_PLUGIN_NATIVE_INCLUDES = ["camera/native"] as const;

/** CameraBridge в main.cpp требует Qt Multimedia даже без плагина Camera в конфиге. */
const ALWAYS_QT_LINK_COMPONENTS = ["Multimedia"] as const;
export function collectQtComponents(manifests: PluginManifest[]): string[] {
  const extra = new Set<string>(ALWAYS_QT_LINK_COMPONENTS);
  for (const manifest of manifests) {
    for (const component of manifest.nativeDeps?.qt ?? []) {
      if (!(BASE_QT_COMPONENTS as readonly string[]).includes(component)) {
        extra.add(component);
      }
    }
  }
  return [...BASE_QT_COMPONENTS, ...[...extra].sort((a, b) => a.localeCompare(b))];
}

export function collectQtFindPackageComponents(manifests: PluginManifest[]): string[] {
  return [...collectQtComponents(manifests), ...BASE_QT_BUILD_COMPONENTS];
}

function pluginNativeSourceLines(manifests: PluginManifest[]): string {
  const lines: string[] = [];
  for (const rel of ALWAYS_PLUGIN_NATIVE_SOURCES) {
    lines.push(`    \${PLUGIN_NATIVE_DIR}/${rel}`);
  }
  for (const manifest of manifests) {
    lines.push(
      `    \${PLUGIN_NATIVE_DIR}/${manifest.name}/native/${manifest.display}Plugin.cpp`,
    );
    for (const extra of EXTRA_PLUGIN_NATIVE_SOURCES[manifest.name] ?? []) {
      lines.push(`    \${PLUGIN_NATIVE_DIR}/${manifest.name}/native/${extra}`);
    }
  }
  return lines.join("\n");
}

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
  const qtLinkComponents = collectQtComponents(manifests);
  const qtFindPackageComponents = collectQtFindPackageComponents(manifests);
  const qtFindPackage = qtFindPackageComponents.join(" ");
  const qtLinkLines = qtLinkComponents.map((c) => `        Qt5::${c}`).join("\n");
  const pluginSources = pluginNativeSourceLines(manifests);
  const pluginIncludes = [
    ...ALWAYS_PLUGIN_NATIVE_INCLUDES.map((rel) => `    \${PLUGIN_NATIVE_DIR}/${rel}`),
    ...manifests.map((m) => `    \${PLUGIN_NATIVE_DIR}/${m.name}/native`),
  ].join("\n");

  const nativeSdkSources = NATIVE_SDK_SOURCES.map(
    (file) => `    \${NATIVE_SDK_DIR}/${file}`,
  ).join("\n");
  const pkgConfigBlock = pluginPkgConfigCmakeBlock(manifests);
  const pkgConfigLinks = hasPluginPkgConfig(manifests)
    ? [...new Set(
        manifests
          .map((m) => PLUGIN_PKGCONFIG_MODULES[m.name])
          .filter((mod): mod is string => mod !== undefined),
      )]
        .sort((a, b) => a.localeCompare(b))
        .map((mod) => `        PkgConfig::${mod.replace(/[^a-zA-Z0-9]/g, "")}`)
        .join("\n")
    : "";

  return `cmake_minimum_required(VERSION 3.5)

project(${appId} VERSION ${version} LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_INCLUDE_CURRENT_DIR ON)

set(CMAKE_INSTALL_RPATH "$ORIGIN/../lib/cef")
set(CMAKE_BUILD_WITH_INSTALL_RPATH TRUE)

find_package(Qt5 COMPONENTS ${qtFindPackage} REQUIRED)
find_package(PkgConfig REQUIRED)

${CMAKE_WEBVIEW_SUBPROCESS_BLOCK}

${CMAKE_QCA_BLOCK}

pkg_check_modules(Auroraapp auroraapp REQUIRED IMPORTED_TARGET)
${pkgConfigBlock}
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
${qtLinkLines}
        PkgConfig::Auroraapp
        \${AUROBORE_WEBVIEW_TARGET}
        PkgConfig::qca2-qt5
${pkgConfigLinks ? pkgConfigLinks + "\n" : ""})

${CMAKE_WEBVIEW_SUBPROCESS_TARGET}

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

  const pluginsDst = path.join(stagingParent, "plugins");
  if (fs.existsSync(pluginsDst)) fs.rmSync(pluginsDst, { recursive: true, force: true });
  fs.mkdirSync(pluginsDst, { recursive: true });

  const root = projectRoot ?? process.cwd();
  const namesToSync = [...new Set([...ALWAYS_SYNC_PLUGINS, ...pluginNames])];

  for (const name of namesToSync) {
    const pluginSrc = resolvePluginNativeDir(root, name);
    if (!pluginSrc) {
      throw new Error(
        `native plugin sources not found: ${name} (install @aurobore/${name} or set AUROBORE_PLUGINS_ROOT)`,
      );
    }
    copyDirFiltered(pluginSrc, path.join(pluginsDst, name), new Set(["generated", "node_modules"]));
  }
}
