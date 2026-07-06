#!/usr/bin/env node
/**
 * Минимальный e2e harness (FR-T2): hello-world-stub → build → run → bridge assert.
 * Запуск из корня репо: pnpm e2e:verify
 * Требует эмулятор Aurora и tools/aurora/local.env.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const CLI_PATH = path.join(REPO_ROOT, "packages", "cli", "dist", "cli.js");
const DEMO_DIR = path.join(REPO_ROOT, "examples", "hello-world-stub");

function log(msg) {
  console.log(`[e2e:verify] ${msg}`);
}

function fail(msg) {
  console.error(`[e2e:verify] ERROR: ${msg}`);
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

function ensureTooling() {
  if (!fs.existsSync(CLI_PATH)) {
    log("building @aurobore/build and @aurobore/cli…");
    if (pnpm(["--filter", "@aurobore/build", "build"]) !== 0) fail("build @aurobore/build");
    if (pnpm(["--filter", "@aurobore/cli", "build"]) !== 0) fail("build @aurobore/cli");
  }
  if (!fs.existsSync(CLI_PATH)) {
    fail(`CLI not found: ${CLI_PATH}`);
  }
}

function main() {
  log("start");
  if (!fs.existsSync(DEMO_DIR)) {
    fail(`missing directory: examples/hello-world-stub`);
  }

  ensureTooling();

  runStep("hello-world-stub aurobore build", () => {
    const res = spawnSync(process.execPath, [CLI_PATH, "build"], {
      cwd: DEMO_DIR,
      stdio: "inherit",
    });
    return res.status ?? 1;
  });

  runStep("hello-world-stub aurobore run (AUROBORE_E2E=1)", () => {
    const res = spawnSync(process.execPath, [CLI_PATH, "run"], {
      cwd: DEMO_DIR,
      stdio: "inherit",
      env: { ...process.env, AUROBORE_E2E: "1" },
    });
    return res.status ?? 1;
  });

  log("e2e:verify complete");
}

main();
