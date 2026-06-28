#!/usr/bin/env node
/**
 * Preflight перед `pnpm run publish`: авторизация npm и доступ к org @aurobore.
 */
import { spawnSync } from "node:child_process";

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
console.log("[publish] preflight OK\n");
