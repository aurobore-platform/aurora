#!/usr/bin/env node
/**
 * Проверка всех examples: web-сборка + aurobore build (RPM).
 * Запуск из корня репо: pnpm demos:verify
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const CLI_PATH = path.join(REPO_ROOT, "packages", "cli", "dist", "cli.js");

/** @type {Array<{ name: string; web?: { filter: string; script: string } }>} */
const DEMOS = [
  { name: "hello-world", web: { filter: "@aurobore/example-hello-world", script: "build:web" } },
  { name: "react-demo", web: { filter: "@aurobore/example-react-demo", script: "build" } },
  { name: "vue-demo", web: { filter: "@aurobore/example-vue-demo", script: "build" } },
  { name: "svelte-demo", web: { filter: "@aurobore/example-svelte-demo", script: "build" } },
  { name: "hello-world-stub" },
  { name: "hybrid-demo" },
  { name: "camera-demo", web: { filter: "@aurobore/example-camera-demo", script: "build:web" } },
  { name: "geo-demo", web: { filter: "@aurobore/example-geo-demo", script: "build:web" } },
  { name: "sensors-demo", web: { filter: "@aurobore/example-sensors-demo", script: "build:web" } },
  { name: "notifications-demo", web: { filter: "@aurobore/example-notifications-demo", script: "build:web" } },
  { name: "share-demo", web: { filter: "@aurobore/example-share-demo", script: "build:web" } },
  { name: "w3c-demo", web: { filter: "@aurobore/example-w3c-demo", script: "build:web" } },
];

function log(msg) {
  console.log(`[demos:verify] ${msg}`);
}

function fail(msg) {
  console.error(`[demos:verify] ERROR: ${msg}`);
  process.exit(1);
}

function runStep(label, fn) {
  log(label);
  const code = fn();
  if (code !== 0) {
    fail(`${label} failed (exit ${code})`);
  }
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
  ensureTooling();

  for (const demo of DEMOS) {
    const demoDir = path.join(REPO_ROOT, "examples", demo.name);
    if (!fs.existsSync(demoDir)) {
      fail(`missing directory: examples/${demo.name}`);
    }

    if (demo.web) {
      runStep(`${demo.name} web (${demo.web.script})`, () =>
        pnpm(["--filter", demo.web.filter, "run", demo.web.script]),
      );
      log(`${demo.name} web OK`);
    }

    runStep(`${demo.name} aurobore build`, () => {
      const res = spawnSync(process.execPath, [CLI_PATH, "build"], {
        cwd: demoDir,
        stdio: "inherit",
      });
      return res.status ?? 1;
    });
    log(`${demo.name} OK`);
  }

  log("all demos OK");
}

main();
