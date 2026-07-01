#!/usr/bin/env node
/**
 * Синхронный bump версии monorepo: packages/*, plugins/*, корень, туториалы, тесты.
 *
 *   pnpm version:bump              # patch +1 (0.0.3 → 0.0.4)
 *   pnpm version:bump -- --to 0.0.5  # задать версию явно
 *   pnpm version:bump -- --dry-run   # только показать изменения
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const CLI_PKG = path.join(REPO_ROOT, "packages", "cli", "package.json");

const TEXT_TARGETS = [
  "docs/tutorials/quick-start.md",
  "docs/tutorials/using-plugins.md",
  "docs/tutorials/demo-existing-app.md",
  "packages/cli/src/version.test.ts",
  "packages/cli/src/commands/init.test.ts",
  "packages/cli/src/commands/uninit.test.ts",
  "packages/build/src/project/init.test.ts",
];

function log(msg) {
  console.log(`[version:bump] ${msg}`);
}

function fail(msg) {
  console.error(`[version:bump] ERROR: ${msg}`);
  process.exit(1);
}

function parseArgs(argv) {
  let to = null;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--to") {
      const value = argv[++i];
      if (!value) fail("ожидается значение после --to");
      to = value;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log(`Usage:
  pnpm version:bump              patch +1 от @aurobore/cli
  pnpm version:bump -- --to X.Y.Z задать версию явно
  pnpm version:bump -- --dry-run  без записи файлов`);
      process.exit(0);
    }
    fail(`неизвестный аргумент: ${arg}`);
  }

  return { to, dryRun };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function bumpPatch(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-.+)?$/.exec(version);
  if (!match) {
    fail(`не semver X.Y.Z: ${version}`);
  }
  const patch = Number(match[3]) + 1;
  return `${match[1]}.${match[2]}.${patch}`;
}

function validateSemver(version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    fail(`ожидается semver X.Y.Z: ${version}`);
  }
}

function discoverPackageJsonPaths() {
  const paths = [path.join(REPO_ROOT, "package.json")];

  for (const dir of ["packages", "plugins"]) {
    const base = path.join(REPO_ROOT, dir);
    if (!fs.existsSync(base)) continue;
    for (const name of fs.readdirSync(base, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      const pkgPath = path.join(base, name.name, "package.json");
      if (fs.existsSync(pkgPath)) {
        paths.push(pkgPath);
      }
    }
  }

  return paths;
}

function replaceVersionLiterals(text, fromVersion, toVersion) {
  let next = text;
  next = next.replaceAll(`@aurobore/cli@^${fromVersion}`, `@aurobore/cli@^${toVersion}`);
  next = next.replaceAll(`"^${fromVersion}"`, `"^${toVersion}"`);
  next = next.replaceAll(`cliVersion: "${fromVersion}"`, `cliVersion: "${toVersion}"`);
  next = next.replaceAll(`.toBe("${fromVersion}")`, `.toBe("${toVersion}")`);
  return next;
}

function main() {
  const { to, dryRun } = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(CLI_PKG)) {
    fail(`не найден ${CLI_PKG}`);
  }

  const currentVersion = readJson(CLI_PKG).version;
  if (!currentVersion) {
    fail("нет version в packages/cli/package.json");
  }

  const nextVersion = to ?? bumpPatch(currentVersion);
  validateSemver(nextVersion);

  if (nextVersion === currentVersion) {
    fail(`новая версия совпадает с текущей (${currentVersion})`);
  }

  log(`${currentVersion} → ${nextVersion}${dryRun ? " (dry-run)" : ""}`);

  const packagePaths = discoverPackageJsonPaths();
  const packageUpdates = [];

  for (const pkgPath of packagePaths) {
    const pkg = readJson(pkgPath);
    if (!pkg.version) continue;

    const rel = path.relative(REPO_ROOT, pkgPath);
    if (pkg.version === nextVersion) {
      log(`skip ${rel} (уже ${nextVersion})`);
      continue;
    }

    packageUpdates.push({ rel, pkgPath, from: pkg.version, name: pkg.name ?? rel });
    if (!dryRun) {
      pkg.version = nextVersion;
      writeJson(pkgPath, pkg);
    }
  }

  const textUpdates = [];
  for (const rel of TEXT_TARGETS) {
    const filePath = path.join(REPO_ROOT, rel);
    if (!fs.existsSync(filePath)) {
      fail(`файл не найден: ${rel}`);
    }

    const before = fs.readFileSync(filePath, "utf8");
    const after = replaceVersionLiterals(before, currentVersion, nextVersion);
    if (before === after) {
      log(`skip ${rel} (нет вхождений ${currentVersion})`);
      continue;
    }

    textUpdates.push(rel);
    if (!dryRun) {
      fs.writeFileSync(filePath, after, "utf8");
    }
  }

  if (packageUpdates.length === 0 && textUpdates.length === 0) {
    fail("нечего менять — проверьте текущую версию и целевые файлы");
  }

  for (const { rel, from, name } of packageUpdates) {
    log(`${dryRun ? "would update" : "updated"} ${name}: ${from} → ${nextVersion} (${rel})`);
  }
  for (const rel of textUpdates) {
    log(`${dryRun ? "would update" : "updated"} ${rel}`);
  }

  if (dryRun) {
    log("dry-run: файлы не изменены");
    return;
  }

  log("готово. Проверка: pnpm test packages/cli/src/version.test.ts packages/cli/src/commands/init.test.ts packages/build/src/project/init.test.ts");
}

main();
