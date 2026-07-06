# OTA Demo

Демонстрация [OTA / Live Updates](../../docs/adr/ADR-012-ota-live-updates.md): подписанный веб-бандл,
канал `stable`, события `update:*`.

## Быстрый старт

```powershell
cd examples/ota-demo
pnpm build:web
node ../../packages/cli/dist/cli.js update publish
```

Ключи уже в `.ota/keys/` (после первого `aurobore update keygen`). `publicKey` в `aurobore.config.json`.

Перед сборкой RPM обновите `updates.url` на LAN IP хоста с OTA-сервером.

```powershell
# терминал 1 — из корня репо
pnpm ota:serve

# терминал 2
aurobore build
aurobore run
```

Опубликовать v2 без пересборки RPM:

```powershell
pnpm publish:ota 1.0.1
```

На устройстве badge сменится после `resume` или автоматической проверки.

## Скрипты

| Команда | Назначение |
|---------|------------|
| `pnpm build:web` | `dist/` с badge `BUNDLE_VERSION` (default `1.0.0`) |
| `pnpm publish:ota [version]` | build + `aurobore update publish` |
