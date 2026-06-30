#!/usr/bin/env node
/**
 * Preflight перед `pnpm run publish`: авторизация npm, доступ к org @aurobore,
 * проверка полной цепочки публикуемых пакетов в workspace.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const PUBLISH_PACKAGES = [
  { name: "@aurobore/runtime", pkgPath: "packages/runtime/package.json" },
  { name: "@aurobore/build", pkgPath: "packages/build/package.json" },
  { name: "@aurobore/cli", pkgPath: "packages/cli/package.json" },
  { name: "@aurobore/core", pkgPath: "packages/core/package.json" },
  { name: "@aurobore/bridge-js", pkgPath: "packages/bridge-js/package.json" },
  { name: "create-aurobore", pkgPath: "packages/create-aurobore/package.json" },
  { name: "@aurobore/echo", pkgPath: "plugins/echo/package.json" },
  { name: "@aurobore/device", pkgPath: "plugins/device/package.json" },
  { name: "@aurobore/storage", pkgPath: "plugins/storage/package.json" },
  { name: "@aurobore/filesystem", pkgPath: "plugins/filesystem/package.json" },
  { name: "@aurobore/clipboard", pkgPath: "plugins/clipboard/package.json" },
  { name: "@aurobore/network", pkgPath: "plugins/network/package.json" },
];

function run(cmd, args) {
  return spawnSync(cmd, args, {
    encoding: "utf8",
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function fail(message, hints = []) {
  console.error(`\n[publish] ${message}\n`);
  for (const line of hints) {
    console.error(`  ${line}`);
  }
  console.error("");
  process.exit(1);
}

function readPackageVersion(relativePath) {
  const full = path.join(REPO_ROOT, relativePath);
  if (!fs.existsSync(full)) {
    fail(`package.json не найден: ${relativePath}`);
  }
  const pkg = JSON.parse(fs.readFileSync(full, "utf8"));
  if (!pkg.version) {
    fail(`нет поля version в ${relativePath}`);
  }
  return pkg.version;
}

function checkPublishChain() {
  const versions = new Map();
  for (const entry of PUBLISH_PACKAGES) {
    const version = readPackageVersion(entry.pkgPath);
    versions.set(entry.name, version);
    console.log(`[publish] ${entry.name}@${version} — OK (workspace)`);
  }

  const coreVersion = versions.get("@aurobore/core");
  const runtimeVersion = versions.get("@aurobore/runtime");
  const buildVersion = versions.get("@aurobore/build");
  const cliVersion = versions.get("@aurobore/cli");

  if (runtimeVersion !== buildVersion || buildVersion !== cliVersion) {
    fail("Версии runtime/build/cli должны совпадать (linked changeset).", [
      `@aurobore/runtime: ${runtimeVersion}`,
      `@aurobore/build: ${buildVersion}`,
      `@aurobore/cli: ${cliVersion}`,
    ]);
  }

  const pluginNames = PUBLISH_PACKAGES.filter((p) => p.name.startsWith("@aurobore/") && p.pkgPath.startsWith("plugins/"));
  const pluginVersions = new Set(pluginNames.map((p) => versions.get(p.name)));
  if (pluginVersions.size > 1) {
    fail("Все plugin-пакеты должны иметь одну версию.", [
      ...pluginNames.map((p) => `${p.name}: ${versions.get(p.name)}`),
    ]);
  }

  const runtimePkg = path.join(REPO_ROOT, "packages/runtime/container");
  if (!fs.existsSync(runtimePkg)) {
    fail("@aurobore/runtime не подготовлен: нет packages/runtime/container", [
      "pnpm --filter @aurobore/runtime prepare",
    ]);
  }

  for (const plugin of pluginNames) {
    const nativeDir = path.join(REPO_ROOT, path.dirname(plugin.pkgPath), "native");
    if (!fs.existsSync(nativeDir)) {
      fail(`${plugin.name}: каталог native/ не найден (${nativeDir})`);
    }
  }

  for (const [name, version] of versions) {
    if (name === "create-aurobore") continue;
    const view = run("npm", ["view", `${name}@${version}`, "version"]);
    if (view.status === 0) {
      console.warn(`[publish] WARN: ${name}@${version} already published on npm`);
    }
  }

  console.log(`[publish] цепочка пакетов OK (core ${coreVersion}, cli stack ${cliVersion})\n`);
}

const whoami = run("npm", ["whoami"]);
if (whoami.status !== 0) {
  const err = (whoami.stderr || whoami.stdout || "").trim();
  fail("npm не авторизован (E401).", [
    "npm logout",
    "npm login",
    "npm whoami   # должен показать ваш username",
    err ? `npm: ${err}` : "",
  ].filter(Boolean));
}

const user = whoami.stdout.trim();
console.log(`[publish] npm user: ${user}`);

const profile = run("npm", ["profile", "get"]);
if (profile.status !== 0) {
  fail("Токен npm недействителен или истёк.", [
    "npm logout",
    "npm login",
    "Если включена 2FA — используйте OTP при login или automation token для CI.",
  ]);
}

const orgLs = run("npm", ["org", "ls", "aurobore"]);
if (orgLs.status !== 0) {
  fail(
    "Нет доступа к org @aurobore (E404 при publish часто означает именно это).",
    [
      "Откройте https://www.npmjs.com/settings/aurobore/members",
      `Добавьте пользователя «${user}» с ролью Owner или Developer.`,
      "Owner org: Settings → Packages → Publishing access → «Require two-factor authentication» — при включении нужен login с 2FA.",
      "После добавления в org повторите: pnpm run publish",
    ],
  );
}

console.log("[publish] org @aurobore: доступ подтверждён");
checkPublishChain();
console.log("[publish] preflight OK\n");
