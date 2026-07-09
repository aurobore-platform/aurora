# OTA / Live Updates (разработка)

См. [ADR-012](https://github.com/aurobore-platform/aurora/blob/main/docs/adr/ADR-012-ota-live-updates.md), [RFC-002](https://github.com/aurobore-platform/aurora/blob/main/docs/rfc/RFC-002-ota-live-updates.md).

## CLI

```powershell
aurobore update keygen [--out .ota/keys]
aurobore update publish [--channel stable] [--private-key .ota/keys/private.pem] [--out .ota]
aurobore update list [--channel stable]
aurobore update rollback --to <version>
```

## Конфиг

```json
"updates": {
  "enabled": true,
  "url": "http://192.168.x.x:8765/ota",
  "channel": "stable",
  "publicKey": "<base64 Ed25519>",
  "checkOnResume": true,
  "checkIntervalMs": 3600000
}
```

Требуется `Internet` в `permissions`.

## Локальная проверка

```powershell
pnpm ota:serve
```

Сервер отдаёт `examples/ota-demo/.ota/` по `http://0.0.0.0:8765/ota/`.

## JS API (`@aurobore/core`)

```ts
import { Updates, on } from "@aurobore/core";

on("update:ready", (info) => { /* … */ });
await Updates.check();
await Updates.getStatus();
```

## Артефакты

- `bundle.tar.gz` — gzip tar web assets
- `manifest.json` + Ed25519 `signature`
- `{channel}/latest.json` — указатель на версию
