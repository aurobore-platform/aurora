#!/usr/bin/env node
/**
 * Dev-toolkit PoC: sync → build → deploy → run (M0.5).
 * Thin wrapper над @aurobore/build; конфиг — tools/aurora/local.env
 */
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const CODEGEN_STAMP_FILE = path.join(REPO_ROOT, ".codegen-plugins.stamp");
const BUILD_DIST = path.join(REPO_ROOT, "packages", "build", "dist", "index.js");

async function loadBuild() {
  if (!fs.existsSync(BUILD_DIST)) {
    throw new Error("@aurobore/build not compiled — run pnpm build first");
  }
  return import(pathToFileURL(BUILD_DIST).href);
}

/** @type {Record<string, { source: string; rpmGlob: string; runScript: string; deployRpmName: string; stagingName: string; extraSync?: Array<{ source: string; destName: string }> }>} */
const PROJECTS = {
  "poc-bridge": {
    source: path.join(REPO_ROOT, "runtime", "poc-bridge"),
    rpmGlob: "ru.auroraos.poc-bridge-*.rpm",
    runScript: path.join(__dirname, "run-poc.sh"),
    deployRpmName: "poc-bridge.rpm",
    stagingName: "poc-bridge",
  },
  container: {
    source: path.join(REPO_ROOT, "runtime", "container"),
    rpmGlob: "ru.auroraos.aurobore-container-*.rpm",
    runScript: path.join(__dirname, "run-container.sh"),
    deployRpmName: "aurobore-container.rpm",
    stagingName: "aurobore-container",
    extraSync: [
      { source: path.join(REPO_ROOT, "runtime", "bridge-native"), destName: "bridge-native" },
      { source: path.join(REPO_ROOT, "runtime", "native-sdk"), destName: "native-sdk" },
      { source: path.join(REPO_ROOT, "plugins"), destName: "plugins" },
    ],
  },
};

const COMMANDS = ["sync", "build", "deploy", "run", "emulator", "all"];

function resolveProject() {
  const name = process.argv[3] || process.env.RUNTIME_PROJECT || "poc-bridge";
  if (!PROJECTS[name]) {
    console.error(`[runtime] ERROR: неизвестный проект: ${name}`);
    process.exit(1);
  }
  return name;
}

const project = resolveProject();
const projectCfg = PROJECTS[project];

function log(msg) {
  console.log(`[${project}] ${msg}`);
}

function fail(msg) {
  console.error(`[${project}] ERROR: ${msg}`);
  process.exit(1);
}

function collectCodegenInputFiles() {
  const files = [];
  const buildSrc = path.join(REPO_ROOT, "packages", "build", "src");
  for (const sub of ["codegen", "manifest"]) {
    const dir = path.join(buildSrc, sub);
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { recursive: true })) {
      const full = path.join(dir, String(entry));
      if (fs.statSync(full).isFile()) files.push(full);
    }
  }
  const script = path.join(REPO_ROOT, "packages", "build", "scripts", "codegen-plugins.mjs");
  if (fs.existsSync(script)) files.push(script);
  const pluginsDir = path.join(REPO_ROOT, "plugins");
  if (fs.existsSync(pluginsDir)) {
    for (const ent of fs.readdirSync(pluginsDir, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue;
      const manifest = path.join(pluginsDir, ent.name, "plugin.manifest");
      if (fs.existsSync(manifest)) files.push(manifest);
    }
  }
  return files.sort();
}

function codegenFingerprint() {
  const hash = crypto.createHash("sha256");
  for (const file of collectCodegenInputFiles()) {
    const st = fs.statSync(file);
    hash.update(path.relative(REPO_ROOT, file).replace(/\\/g, "/"));
    hash.update(String(st.mtimeMs));
    hash.update(String(st.size));
  }
  return hash.digest("hex");
}

function runCodegenPlugins() {
  const fingerprint = codegenFingerprint();
  const saved = fs.existsSync(CODEGEN_STAMP_FILE)
    ? fs.readFileSync(CODEGEN_STAMP_FILE, "utf8").trim()
    : null;
  if (saved === fingerprint) {
    log("codegen: skip (unchanged)");
    return;
  }
  log("codegen: plugins");
  const res = spawnSync("pnpm", ["codegen:plugins"], {
    cwd: REPO_ROOT,
    shell: true,
    stdio: "inherit",
  });
  if (res.status !== 0) fail(`codegen:plugins exit ${res.status}`);
  fs.writeFileSync(CODEGEN_STAMP_FILE, `${fingerprint}\n`, "utf8");
}

async function main() {
  const cmd = process.argv[2];
  if (!cmd || !COMMANDS.includes(cmd)) {
    console.log(`Usage: node tools/aurora/poc.mjs <${COMMANDS.join("|")}> [project]`);
    process.exit(cmd ? 1 : 0);
  }

  const build = await loadBuild();
  const env = build.loadAuroraEnv({ stagingName: projectCfg.stagingName });
  env.POC_BUILD_DIR = env.POC_BUILD_DIR || path.join(os.homedir(), "aurobore-spike", projectCfg.stagingName);

  if (cmd === "sync" || cmd === "build" || cmd === "all") {
    if (project === "container" && (cmd === "build" || cmd === "all")) {
      runCodegenPlugins();
    }
    if (cmd === "sync" || cmd === "build" || cmd === "all") {
      build.syncProject({
        source: projectCfg.source,
        destination: env.POC_BUILD_DIR,
        extraSync: projectCfg.extraSync,
        env,
      });
      log(`sync → ${env.POC_BUILD_DIR}`);
    }
  }

  if (cmd === "build" || cmd === "all") {
    build.sfdkBuild(env.POC_BUILD_DIR, env.SFDK_TARGET, env);
    const rpm = build.findRpm(env.POC_BUILD_DIR, projectCfg.rpmGlob);
    log(`build: ${rpm}`);
  }

  if (cmd === "deploy" || cmd === "all") {
    const rpm = build.findRpm(env.POC_BUILD_DIR, projectCfg.rpmGlob);
    await build.deployRpm({ rpmPath: rpm, remoteRpmName: projectCfg.deployRpmName, env });
    log("deploy: RPM установлен");
  }

  if (cmd === "run" || cmd === "all") {
    await build.runOnEmulator({
      runScriptPath: projectCfg.runScript,
      remoteScriptName: `run-${project}.sh`,
      env,
    });
  }

  if (cmd === "emulator") {
    await build.ensureEmulator(env);
    log("emulator: готов");
  }

  if (cmd === "all") log("all: готово");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
