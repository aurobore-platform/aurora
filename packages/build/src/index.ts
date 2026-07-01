export * from "./manifest/types.js";
export { parseManifest, validateManifest } from "./manifest/parse.js";
export {
  generateJsWrapper,
  generateTypes,
  generateNativeRegistry,
  generatePluginBundle,
  manifestTypeToTs,
  methodArgsType,
} from "./codegen/generate.js";
export {
  runProjectCodegen,
  runProjectCodegenFromConfig,
  resolvePluginManifests,
  findManifestPath,
  findMonorepoRoot,
} from "./codegen/project.js";

export type { AuroraArch, NativeProjectSpec } from "./arch.js";
export { isAuroraArch } from "./arch.js";

export type {
  AuroboreConfig,
  AppConfig,
  WebConfig,
  BuildConfig,
  EffectiveConfig,
  ConfigValidationError,
  LoadedConfig,
} from "./config/types.js";
export { loadConfig, parseConfig, validateConfig, findConfigFile, isValidAppId, isValidSemver } from "./config/parse.js";
export { resolveEffectiveConfig, pluginNameFromRef } from "./config/merge.js";
export { applyConfigDefaults } from "./config/defaults.js";

export { AURORA_ICON_SIZES, checkProjectIcons } from "./native/icons.js";
export type { IconCheckResult, ResolvedAppIcons } from "./native/icons.js";
export {
  generateNativeProject,
  generateSpec,
  generateDesktop,
  generateDefaultsJson,
  generateCMakeLists,
  resolveRuntimeRoot,
  resolveBundledRuntimeRoot,
  resolvePluginNativeDir,
  syncRuntimeSiblings,
} from "./native/generate.js";
export type { ResolveRuntimeRootOptions } from "./native/generate.js";

export type { AuroraEnv } from "./aurora/env.js";
export { loadAuroraEnv, childEnv, resolveSfdkPath, openSshTool } from "./aurora/env.js";
export { probeDockerDaemon, assertBuildEngineReady, isMsysShell } from "./aurora/docker.js";
export type { DockerProbeResult, DockerProbeStatus } from "./aurora/docker.js";
export { syncDir, syncProject, runCommand, pathsEqual } from "./aurora/sync.js";
export { sfdkBuild, findRpm } from "./aurora/sdk.js";
export { ensureEmulator } from "./aurora/emulator.js";
export { deployRpm, runOnEmulator, generateRunScript } from "./aurora/deploy.js";

export { buildApp, runApp } from "./pipeline/buildApp.js";
export type { BuildAppOptions, BuildResult, BuildReport, RunAppOptions } from "./pipeline/buildApp.js";

export {
  startDevServer,
  resolveDevHost,
  resolveTemplateDir,
  copyTemplate,
} from "./dev/server.js";
export type { DevServerOptions } from "./dev/server.js";
export {
  materializeDevAssets,
  devAssetsDir,
  BRIDGE_ASSET_ROUTES,
  bridgeAssetsMiddleware,
} from "./dev/bridgeAssets.js";
export type { DevAssetsPaths } from "./dev/bridgeAssets.js";
export {
  detectDevBackend,
  isViteProject,
  isVanillaEsbuildProject,
  resolveDevWebRoot,
} from "./dev/detect.js";
export type { DevBackendKind } from "./dev/detect.js";
export { startEsbuildDevServer } from "./dev/esbuild.js";
export type { EsbuildDevServerOptions, EsbuildDevServerResult } from "./dev/esbuild.js";
export { startViteDevServer } from "./dev/vite.js";
export type { ViteDevServerOptions, ViteDevServerResult } from "./dev/vite.js";
export { startDevBackend, printDevBanner } from "./dev/start.js";
export type { StartDevBackendOptions, DevBackendResult } from "./dev/start.js";
export { isPortAvailable, probeTcpHost } from "./dev/networkProbe.js";

export {
  BUILTIN_PLUGINS,
  isBuiltinPlugin,
  builtinNpmRef,
  normalizePluginName,
  formatBuiltinPluginList,
  resolvePluginRefs,
} from "./plugins/catalog.js";
export type { BuiltinPluginName } from "./plugins/catalog.js";
export { checkPluginCompat } from "./plugins/resolve.js";
export type { PluginCompatStatus, PluginCompatResult } from "./plugins/resolve.js";
export {
  listPlugins,
  formatPluginList,
  addPlugin,
  removePlugin,
} from "./plugins/manage.js";
export {
  createPluginScaffold,
  toDisplayName,
  toErrorCode,
} from "./plugins/create.js";
export type { CreatePluginOptions, CreatePluginResult } from "./plugins/create.js";
export type {
  PluginListEntry,
  PluginSource,
  AddPluginOptions,
  RemovePluginOptions,
} from "./plugins/manage.js";
export { refreshNativePluginArtifacts } from "./plugins/refresh.js";

export {
  detectWebRoot,
  detectPackageManager,
  collectInitDefaults,
  buildInitConfig,
  buildInitPackageScripts,
  applyInitToProject,
  removeInitFromProject,
} from "./project/init.js";
export type {
  PackageManager,
  InitConfigInput,
  ApplyInitOptions,
  ApplyRemoveInitOptions,
  InitProjectDefaults,
  InitResult,
  RemoveInitResult,
} from "./project/init.js";

export { bundleWebApp, bundleVanillaWebApp } from "./web/bundle.js";
export type { BundleWebAppOptions } from "./web/bundle.js";
