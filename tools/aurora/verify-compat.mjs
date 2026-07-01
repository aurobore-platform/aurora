#!/usr/bin/env node
/**
 * Прогон совместимости A6: container:all на текущем SFDK_TARGET.
 * Запуск из корня репо: pnpm compat:verify [-- --with-demos] [-- --run-demo hello-world]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const BUILD_DIST = path.join(REPO_ROOT, "packages", "build", "dist", "index.js");
const CLI_PATH = path.join(REPO_ROOT, "packages", "cli", "dist", "cli.js");
const POC_SCRIPT = path.join(__dirname, "poc.mjs");

function log(msg) {
  console.log(`[compat:verify] ${msg}`);
}

function fail(msg) {
  console.error(`[compat:verify] ERROR: ${msg}`);
  process.exit(1);
}

function runStep(label, fn) {
  log(label);
  const code = fn();
  if (code !== 0) {
    fail(`${label} failed (exit ${code})`);
  }
  log(`${label} OK`);
}

function pnpm(args, cwd = REPO_ROOT) {
  const res = spawnSync("pnpm", args, { cwd, shell: true, stdio: "inherit" });
  return res.status ?? 1;
}

async function loadBuild() {
  if (!fs.existsSync(BUILD_DIST)) {
    log("building @aurobore/build…");
    if (pnpm(["--filter", "@aurobore/build", "build"]) !== 0) fail("build @aurobore/build");
  }
  return import(pathToFileURL(BUILD_DIST).href);
}

function parseFlags() {
  const argv = process.argv.slice(2);
  return {
    skipDemos: argv.includes("--skip-demos"),
    withDemos: argv.includes("--with-demos"),
    runDemo: (() => {
      const idx = argv.indexOf("--run-demo");
      if (idx === -1) return null;
      const name = argv[idx + 1];
      if (!name) fail("--run-demo requires a demo name (e.g. hello-world)");
      return name;
    })(),
  };
}

function printChecklist() {
  log("");
  log("=== Checklist for docs/aurora/compatibility-matrix.md ===");
  log("1. Update scenario table for current SFDK_TARGET");
  log("2. Record container journal markers (M1/M2/M3 OK)");
  log("3. If --run-demo used: confirm app starts on emulator");
  log("4. Run hello-world Benchmark button; fill V-7 table");
  log("=========================================================");
}

function main() {
  const flags = parseFlags();
  log("start");

  loadBuild()
    .then((build) => {
      const env = build.loadAuroraEnv({ stagingName: "aurobore-container" });
      log(`SFDK_TARGET=${env.SFDK_TARGET ?? "(not set)"}`);

      // По умолчанию demos:verify пропускается — его запускайте отдельно (`pnpm demos:verify`).
      // Полный прогон: `pnpm compat:verify -- --with-demos`
      if (flags.withDemos) {
        log("step 1/2: demos:verify (7 RPM builds, может занять 30–60 мин)");
        runStep("demos:verify", () => pnpm(["demos:verify"]));
      } else if (flags.skipDemos) {
        log("step 1/2: demos:verify skipped (--skip-demos)");
      } else {
        log("step 1/2: demos:verify skipped (по умолчанию; для полного прогона: --with-demos)");
      }

      log("step 2/2: container:all (sync + sfdk build + deploy + run)");
      log("hint: не запускайте параллельно с demos:verify — общий каталог aurobore-spike/plugins");
      runStep("container:all", () => {
        const res = spawnSync(process.execPath, [POC_SCRIPT, "all", "container"], {
          cwd: REPO_ROOT,
          stdio: "inherit",
        });
        return res.status ?? 1;
      });

      const runDemo = flags.runDemo;
      if (runDemo) {
        const demoDir = path.join(REPO_ROOT, "examples", runDemo);
        if (!fs.existsSync(demoDir)) {
          fail(`missing demo: examples/${runDemo}`);
        }
        if (!fs.existsSync(CLI_PATH)) {
          runStep("build CLI", () => pnpm(["--filter", "@aurobore/cli", "build"]));
        }
        runStep(`aurobore run (${runDemo})`, () => {
          const res = spawnSync(process.execPath, [CLI_PATH, "run"], {
            cwd: demoDir,
            stdio: "inherit",
          });
          return res.status ?? 1;
        });
      }

      printChecklist();
      log("compat:verify complete");
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

main();
