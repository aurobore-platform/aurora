# ADR-010: W3C API polyfills — опциональный адаптерный слой

- **Статус:** Accepted
- **Дата:** 2026-07-06
- **Связанные требования:** FR-S6, FR-S3, FR-P6, G1
- **Связанные ADR/RFC:** [RFC-001](../rfc/RFC-001-w3c-polyfills.md), [ADR-002](ADR-002-bridge-model.md), [ADR-011](ADR-011-camera-frame-channel.md)

## Контекст

Перенос SPA/PWA (аудитория №2, vision) требует работы существующего кода, использующего
`navigator.*` и `Notification`, без замены на `Aurobore.<Plugin>`. Плагины A3 и Clipboard MVP
уже реализованы; нужен тонкий адаптер поверх моста.

Ограничение **N2** (не UI-фреймворк): полифилы — API-адаптеры, не компоненты.

## Рассмотренные варианты

1. **Отдельный пакет `@aurobore/polyfills` + IIFE `aurobore-polyfills.js` (выбран).**
   Опциональная загрузка, зеркалит паттерн `bridge-js` / `web-shim`.
2. **Модуль внутри `@aurobore/core`** — отвергнут: увеличивает обязательный SDK.
3. **Расширить `web-shim`** — отвергнут: web-shim = lifecycle/safe-area (FR-C12), смешение ответственности.

## Решение

- Пакет `packages/polyfills` (`@aurobore/polyfills`).
- `installPolyfills(options?)` патчит globals после загрузки `window.Aurobore`.
- IIFE-бандл `aurobore-polyfills.js` для контейнера; ESM-экспорт для bundled apps.
- Opt-in через `web.polyfills` в `aurobore.config`.
- **Дефолтный набор (`web.polyfills: true`) = 4 «лёгких» invoke-адаптера** (`DEFAULT_POLYFILL_IDS`:
  geolocation, share, notification, clipboard). `mediaDevices` (getUserMedia) **не в дефолте** —
  только явный opt-in (`web.polyfills: [..., "mediaDevices"]`), т.к. это API движка (engine-first,
  [ADR-011](ADR-011-camera-frame-channel.md)).
- Выбранный набор прокидывается в рантайм атрибутом `data-polyfills="…"` (CSV) на теге скрипта;
  IIFE читает его через `document.currentScript.dataset.polyfills` и ставит только перечисленные.
- Порядок скриптов: `aurobore-bridge.js` → `aurobore-plugins.js` → `aurobore-polyfills.js` → app.
- Достаточный subset W3C; ошибки через `DOMException` / `PositionError`.
- Не патчить, если нативный API уже есть.

## Последствия

- (+) G1 без переписывания SPA; работает в prod и `dev --web` (mock-host).
- (+) Изоляция от core/bridge; явный opt-in.
- (−) Два публичных API (W3C + Aurobore) — документировать приоритет нативного API.
- (−) Camera/getUserMedia — engine-first, opt-in; fallback требует ADR-011 (заблокирован на device-спайк).

## Заметки/верификация

- Демо `examples/w3c-demo` — acceptance test без `@aurobore/*` imports.
- `pnpm demos:verify` + `dev --web` + `container:all` (camera stream).
