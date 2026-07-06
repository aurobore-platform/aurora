# RFC-002: OTA / Live Updates веб-бандла

- **Статус:** Accepted
- **Автор(ы):** Aurobore team
- **Дата:** 2026-07-06
- **Связанные требования/ADR:** FR-R13, FR-C14, NFR-2, NFR-5, NFR-11; [ADR-012](../adr/ADR-012-ota-live-updates.md)

## Резюме

Подписанные OTA-обновления веб-части приложения без переиздания RPM: каналы (`stable`/`beta`),
CLI `aurobore update publish|list|rollback`, runtime-проверка/скачивание/немедленное применение с откатом,
JS-события `update:*` и API `Aurobore.Updates`.

## Мотивация

WebView-приложение Aurobore — по сути веб-бандл в нативной оболочке. Обновления UI/логики можно
доставлять «по воздуху», как Capacitor Live Updates или Expo Updates. Это снижает цикл релиза
веб-части и является ключевым преимуществом платформы ([improvements-plan.md](../improvements-plan.md) II.1).

## Детальное предложение

### Артефакты

- `bundle.tar.gz` — детерминированный архив `web.root` (sorted paths, fixed mtime).
- `manifest.json` — метаданные версии, хеш, совместимость.
- `manifest.sig` — detached Ed25519-подпись canonical JSON manifest (без поля `signature`).
- `{channel}/latest.json` — указатель `{ "bundleVersion", "manifestUrl", "bundleUrl" }`.

### Хостинг

Разработчик размещает артефакты на любом HTTPS static host (CDN, S3, nginx). В репозитории —
только CLI publish и `tools/aurora/serve-ota.mjs` для локальной проверки на эмуляторе.

### Конфиг (`aurobore.config`)

```json
"updates": {
  "enabled": true,
  "url": "https://cdn.example.com/myapp/ota",
  "channel": "stable",
  "publicKey": "<base64 Ed25519 pubkey>",
  "checkOnResume": true,
  "checkIntervalMs": 3600000
}
```

`publicKey` вшивается в RPM; приватный ключ — только у разработчика/CI. Требуется `Internet`.

### Runtime

`UpdateManager` (C++): `QNetworkAccessManager` для fetch, QCA Ed25519 для verify, каталоги в
`AppDataLocation/aurobore/updates/{active,staging,previous}`. При старте — `active/` если валиден,
иначе factory `html/` из RPM. После verify — immediate apply: atomic swap → `setWebRoot` → reload WebView.

### JS API

Built-in `UpdatesPlugin`: `check()`, `apply()`, `rollback()`, `getStatus()`; события
`update:available`, `update:ready`, `update:applied`, `update:error`.

### Границы

Обновляется **только** веб-бандл. Permissions, нативный слой, плагины — только через RPM.

## Альтернативы

1. **Delta-патчи** — отложено (Alpha: full bundle only).
2. **JS-driven download через Network plugin** — отвергнут: нет HTTP в Network MVP; безопаснее натив.
3. **Apply on next cold start** — отвергнут для MVP: выбран immediate apply с auto-rollback.
4. **Hosted SaaS (EAS-like)** — вне репозитория ([improvements-plan.md](../improvements-plan.md)).

## Влияние и совместимость

- Opt-in (`updates.enabled: false` по умолчанию).
- Обратная совместимость: приложения без `updates` работают как сейчас.
- `minOs`, `minRuntimeVersion` в manifest — отклонение несовместимого бандла.
- Диск: до 3× размера бандла (active + previous + staging).

## Открытые вопросы

- QCA Ed25519 на всех целевых SDK — верификация на эмуляторе; fallback RSA-PSS при необходимости.
- Delta updates — post-Alpha.

## Итог

Принято → [ADR-012](../adr/ADR-012-ota-live-updates.md).
