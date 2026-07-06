# ADR-012: OTA bundle updates — подписанные live-обновления веб-части

- **Статус:** Accepted
- **Дата:** 2026-07-06
- **Связанные требования:** FR-R13, FR-C14, NFR-2, NFR-5, NFR-11
- **Связанные ADR/RFC:** [RFC-002](../rfc/RFC-002-ota-live-updates.md), [ADR-001](ADR-001-runtime-architecture.md), [ADR-006](ADR-006-configuration-format.md), [ADR-007](ADR-007-packaging-build.md)

## Контекст

Веб-приложение вшивается в RPM (`html/`). Для продуктовых итераций нужна доставка нового веб-бандла
без переустановки пакета. Требования безопасности: доверие к источнику, целостность, откат при сбое.
`AssetResolver` уже поддерживает динамический `webRoot` и `app-data/` в `AppDataLocation`.

## Рассмотренные варианты

1. **Ed25519 detached signature + full bundle tar.gz (выбран).** Малый ключ, быстрая verify на
   устройстве; QCA уже инициализирован в контейнере.
2. **RSA-PSS.** Совместимость шире, но ключи крупнее; резерв при недоступности Ed25519 в QCA.
3. **Неподписанный HTTPS-only.** Отвергнут: MITM на корпоративных сетях.
4. **Apply on next launch.** Отвергнут для MVP в пользу immediate apply с auto-rollback по таймауту splash.

## Решение

### Доверие

- Пара Ed25519: `aurobore update keygen` → `private.pem` (CI/локально), `publicKey` base64 в config/RPM.
- Runtime проверяет `manifest.sig` над canonical JSON до распаковки; сверяет `sha256` архива.

### Формат и каналы

```
{outDir}/{channel}/{bundleVersion}/
  manifest.json
  manifest.sig
  bundle.tar.gz
{outDir}/{channel}/latest.json
```

### Runtime (`UpdateManager`)

Каталоги: `AppDataLocation/aurobore/updates/{state.json,active,staging,previous}`.

- Bootstrap: валидный `active/` → `setWebRoot(active/)`, иначе bundled `html/`.
- Check on resume + interval: fetch `latest.json` → download → verify → extract `staging/`.
- Immediate apply: swap `active`/`previous`/`staging`, reload WebView, ждать `aurobore:ready`.
- Auto-rollback при таймауте splash; ручной `Updates.rollback()`.

### CLI

`aurobore update keygen|publish|list|rollback` — формирование и управление локальным output (CDN — вне репо).

### JS

Built-in `UpdatesPlugin` (не npm-плагин): invoke + события `update:*`.

### Границы

Только web assets. Permissions, native code, plugin manifests — RPM-only.

## Последствия

- (+) Быстрые итерации веб-части; киллер-фича WebView-платформы.
- (+) Factory bundle в RPM как fallback при ошибках OTA.
- (−) Диск: до 3× размер бандла; без delta в Alpha.
- (−) Immediate reload требует корректного поведения SPA (без service worker в MVP).
- Влияние: `packages/build`, `packages/cli`, `runtime/container`, `packages/core`, config schema.

## Заметки/верификация

- `examples/ota-demo` + `pnpm ota:serve` + эмулятор.
- Проверить QCA Ed25519 на Aurora SDK 5.2.x; при сбое — зафиксировать RSA fallback в дополнении ADR.
