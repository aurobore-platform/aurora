import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "../config/parse.js";
import { generateNativeProject, syncRuntimeSiblings } from "../native/generate.js";
import { loadAuroraEnv } from "../aurora/env.js";
import { syncProject } from "../aurora/sync.js";
import { sfdkBuild, findRpm } from "../aurora/sdk.js";
import { deployRpm, generateRunScript, runOnEmulator } from "../aurora/deploy.js";
import type { AuroraArch } from "../arch.js";

export interface BuildAppOptions {
  projectRoot?: string;
  arch?: AuroraArch;
  target?: string;
  mode?: "prod" | "dev";
  stagingDir?: string;
  /** Override web entry URL (dev server). */
  devEntryUrl?: string;
}

export interface BuildResult {
  appId: string;
  rpmPath: string;
  stagingDir: string;
  report: BuildReport;
}

export interface BuildReport {
  appId: string;
  version: string;
  plugins: string[];
  permissions: string[];
  mode: "prod" | "dev";
}

export interface RunAppOptions {
  projectRoot?: string;
  rpmPath?: string;
  stagingDir?: string;
}

function resolveProjectRoot(projectRoot?: string): string {
  return path.resolve(projectRoot ?? process.cwd());
}

/** Полный pipeline сборки приложения. */
export async function buildApp(options: BuildAppOptions = {}): Promise<BuildResult> {
  const projectRoot = resolveProjectRoot(options.projectRoot);
  const { config: loadedConfig } = loadConfig(projectRoot);
  const config =
    options.devEntryUrl != null
      ? { ...loadedConfig, web: { ...loadedConfig.web, entryUrl: options.devEntryUrl } }
      : loadedConfig;
  const mode = options.mode ?? "prod";

  const { nativeDir, appId, manifests } = await generateNativeProject({
    projectRoot,
    config,
    mode,
  });

  const pluginNames = manifests.map((m) => m.name);
  const effectivePermissions = [
    ...new Set([
      ...(config.permissions ?? []),
      ...manifests.flatMap((m) => m.permissions ?? []),
    ]),
  ].sort();
  const env = loadAuroraEnv({
    projectRoot,
    stagingName: appId,
    stagingDir: options.stagingDir,
  });
  const target = options.target ?? env.SFDK_TARGET;
  const stagingDir = env.POC_BUILD_DIR;

  syncProject({
    source: nativeDir,
    destination: stagingDir,
    env,
  });

  syncRuntimeSiblings(stagingDir, pluginNames, undefined, projectRoot);

  sfdkBuild(stagingDir, target, env);

  const rpmGlob = `${appId}-*.rpm`;
  const rpmPath = findRpm(stagingDir, rpmGlob);

  const meta = { appId, rpmPath, stagingDir, builtAt: new Date().toISOString() };
  fs.mkdirSync(path.join(projectRoot, ".aurobore"), { recursive: true });
  fs.writeFileSync(
    path.join(projectRoot, ".aurobore", "last-build.json"),
    `${JSON.stringify(meta, null, 2)}\n`,
    "utf8",
  );

  return {
    appId,
    rpmPath,
    stagingDir,
    report: {
      appId,
      version: config.app.version,
      plugins: pluginNames,
      permissions: effectivePermissions,
      mode,
    },
  };
}

/** Устанавливает и запускает приложение на эмуляторе. */
export async function runApp(options: RunAppOptions = {}): Promise<void> {
  const projectRoot = resolveProjectRoot(options.projectRoot);
  const lastBuildPath = path.join(projectRoot, ".aurobore", "last-build.json");

  let rpmPath = options.rpmPath;
  let appId: string;

  if (rpmPath && fs.existsSync(rpmPath)) {
    appId = path.basename(rpmPath).replace(/-\d.*\.rpm$/, "");
  } else if (fs.existsSync(lastBuildPath)) {
    const last = JSON.parse(fs.readFileSync(lastBuildPath, "utf8")) as {
      rpmPath: string;
      appId: string;
    };
    rpmPath = last.rpmPath;
    appId = last.appId;
  } else {
    const { config } = loadConfig(projectRoot);
    appId = config.app.id;
    const env = loadAuroraEnv({ projectRoot, stagingName: appId, stagingDir: options.stagingDir });
    rpmPath = findRpm(env.POC_BUILD_DIR, `${appId}-*.rpm`);
  }

  const env = loadAuroraEnv({ projectRoot, stagingName: appId, stagingDir: options.stagingDir });
  await deployRpm({
    rpmPath: rpmPath!,
    remoteRpmName: `${appId}.rpm`,
    env,
  });

  const runScript = generateRunScript(appId, env);
  const runScriptPath = path.join(projectRoot, ".aurobore", "run-app.sh");
  fs.mkdirSync(path.dirname(runScriptPath), { recursive: true });
  fs.writeFileSync(runScriptPath, runScript, "utf8");

  await runOnEmulator({
    runScriptPath,
    remoteScriptName: "run-aurobore-app.sh",
    env,
  });
}
