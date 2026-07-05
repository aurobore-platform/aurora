# hybrid-demo

Минимальная фикстура для гибридных приложений: bundled SPA + whitelist external HTTPS origin (W+2 gate).

```powershell
cd examples/hybrid-demo
pnpm --filter @aurobore/cli exec aurobore config validate
pnpm --filter @aurobore/cli exec aurobore build
pnpm --filter @aurobore/cli exec aurobore run
```

## Конфиг

`web.allowedOrigins: ["https://example.com"]` + `permissions: ["Internet"]` — пробрасывается в
`.aurobore/native/config/defaults.json` при `aurobore build`.

## Ручная проверка на эмуляторе

1. `aurobore run` — приложение открывается на loopback SPA.
2. Tap **Open example.com** — переход на whitelisted origin (без block URL policy).
3. Journal: загрузка `https://example.com` без ошибок навигации.

Статический `dist/index.html` включён в репозиторий (как `hello-world-stub`); пересборка веба не требуется.

Проверка всех examples из корня монорепо: `pnpm demos:verify`.
