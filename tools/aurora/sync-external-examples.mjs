#!/usr/bin/env node
/**
 * Sync external reference clones into examples_external/ (gitignored).
 * Usage: pnpm external:sync [-- id ...]
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const EXTERNAL_ROOT = path.join(REPO_ROOT, "examples_external");
const MANIFEST_PATH = path.join(EXTERNAL_ROOT, "manifest.json");

function log(msg) {
  console.log(`[external:sync] ${msg}`);
}

function fail(msg) {
  console.error(`[external:sync] ERROR: ${msg}`);
  process.exit(1);
}

function runGit(args, cwd) {
  const res = spawnSync("git", args, { cwd, stdio: "inherit" });
  return res.status ?? 1;
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    fail(`manifest not found: ${MANIFEST_PATH}`);
  }
  let entries;
  try {
    entries = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  } catch (e) {
    fail(`invalid manifest JSON: ${e.message}`);
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    fail("manifest must be a non-empty array");
  }
  for (const entry of entries) {
    if (!entry.id || !entry.url || !entry.ref || !entry.path) {
      fail(`manifest entry missing id/url/ref/path: ${JSON.stringify(entry)}`);
    }
  }
  return entries;
}

function syncEntry(entry) {
  const dest = path.join(EXTERNAL_ROOT, entry.path);
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  if (fs.existsSync(path.join(dest, ".git"))) {
    log(`update ${entry.id} → ${entry.path} (${entry.ref})`);
    let code = runGit(["fetch", "origin", entry.ref, "--depth", "1"], dest);
    if (code !== 0) {
      code = runGit(["fetch", "origin"], dest);
      if (code !== 0) return code;
    }
    code = runGit(["checkout", "FETCH_HEAD"], dest);
    if (code !== 0) {
      code = runGit(["checkout", entry.ref], dest);
      if (code !== 0) return code;
    }
  } else {
    if (fs.existsSync(dest)) {
      fail(`path exists but is not a git repo: ${dest}`);
    }
    log(`clone ${entry.id} → ${entry.path} (${entry.ref})`);
    const code = runGit(
      ["clone", "--depth", "1", "-b", entry.ref, entry.url, dest],
      EXTERNAL_ROOT
    );
    if (code !== 0) return code;
  }

  log(`${entry.id} OK`);
  if (Array.isArray(entry.keyFiles) && entry.keyFiles.length > 0) {
    log(`  key files (under ${entry.path}/):`);
    for (const rel of entry.keyFiles) {
      const full = path.join(dest, rel);
      const mark = fs.existsSync(full) ? "✓" : "?";
      log(`    ${mark} ${rel}`);
    }
  }
  return 0;
}

function discoverNativeSources(entry) {
  const dest = path.join(EXTERNAL_ROOT, entry.path);
  if (!fs.existsSync(dest)) return;

  const auroraPkg = path.join(dest, "packages", "webview_flutter_aurora");
  if (!fs.existsSync(auroraPkg)) return;

  const nativeDirs = ["aurora", "linux", "src"];
  for (const dir of nativeDirs) {
    const full = path.join(auroraPkg, dir);
    if (fs.existsSync(full)) {
      log(`  native sources: packages/webview_flutter_aurora/${dir}/`);
    }
  }

  const cppFiles = [];
  function walk(dir, prefix) {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      const rel = prefix ? `${prefix}/${name}` : name;
      if (fs.statSync(full).isDirectory()) {
        if (name === ".git" || name === "build") continue;
        walk(full, rel);
      } else if (name.endsWith(".cpp") || name.endsWith(".h") || name.endsWith(".cc")) {
        cppFiles.push(`packages/webview_flutter_aurora/${rel}`);
      }
    }
  }
  walk(auroraPkg, "");
  if (cppFiles.length > 0) {
    log(`  C++ headers/sources (${cppFiles.length}):`);
    for (const f of cppFiles.slice(0, 12)) {
      log(`    ${f}`);
    }
    if (cppFiles.length > 12) {
      log(`    … and ${cppFiles.length - 12} more`);
    }
  }
}

function main() {
  const filterIds = process.argv.slice(2).filter((a) => a !== "--");
  const allEntries = loadManifest();
  const entries =
    filterIds.length > 0
      ? allEntries.filter((e) => filterIds.includes(e.id))
      : allEntries;

  if (filterIds.length > 0 && entries.length === 0) {
    fail(`no manifest entries for id(s): ${filterIds.join(", ")}`);
  }

  for (const entry of entries) {
    const code = syncEntry(entry);
    if (code !== 0) {
      fail(`sync failed for ${entry.id} (exit ${code})`);
    }
    if (entry.id === "webview-flutter") {
      discoverNativeSources(entry);
    }
  }

  log("done");
}

main();
