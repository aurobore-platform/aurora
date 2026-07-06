# RFC-001: Полифилы W3C API поверх плагинов

- **Статус:** Accepted
- **Автор(ы):** Aurobore platform
- **Дата:** 2026-07-06
- **Связанные требования/ADR:** FR-S6, FR-S3, FR-P6, G1; [ADR-010](../adr/ADR-010-w3c-polyfills.md), [ADR-011](../adr/ADR-011-camera-frame-channel.md)

## Резюме

Опциональный пакет `@aurobore/polyfills` патчит стандартные браузерные API (`navigator.geolocation`,
`navigator.share`, `Notification`, `navigator.clipboard`, `navigator.mediaDevices.getUserMedia`) и
делегирует вызовы существующим плагинам Aurobore через мост.

## Мотивация

Цель **G1** ([vision.md](../vision.md)): перенос существующих SPA/PWA на Аврора без переписывания
кода. Сейчас приложения обязаны использовать `@aurobore/*` или `Aurobore.<Plugin>`. Полифилы
закрывают разрыв для кода, написанного под стандартный Web Platform API.

## Детальное предложение

### Объём соответствия

**«Достаточный» subset** — методы, востребованные типичными SPA/PWA, без полного соответствия
спецификациям W3C. Неподдерживаемые опции игнорируются или отклоняются предсказуемым `DOMException`.

### Маппинг API

| Web-стандарт | Плагин Aurobore |
|---|---|
| `navigator.geolocation` | Geolocation |
| `navigator.share` / `canShare` | Share |
| `Notification` | Notifications |
| `navigator.clipboard` (text) | Clipboard |
| `navigator.mediaDevices.getUserMedia` | **engine-first**; `mediaDevices` — opt-in, Camera-fallback заблокирован на спайк |

**Дефолт vs opt-in.** `web.polyfills: true` ставит **4 «лёгких»** invoke-адаптера
(geolocation, share, notification, clipboard). `mediaDevices` — только явный opt-in
(`web.polyfills: [..., "mediaDevices"]`), т.к. `getUserMedia` — API движка (engine-first);
Camera-fallback заблокирован на device-спайк ([ADR-011](../adr/ADR-011-camera-frame-channel.md)).

### Деградация

- При bootstrap **не бросать** исключения.
- Не патчить API, если нативная реализация уже присутствует и проходит проверку `typeof`.
- При вызове недоступного метода — `reject` Promise с `DOMException` (или callback error для legacy geolocation).
- Отсутствие железа/разрешения → коды W3C (`POSITION_UNAVAILABLE`, `NotAllowedError`, `NotFoundError`).

### Ошибки

Маппинг `AuroboreError` (FR-S3) → `DOMException` / `GeolocationPositionError` по таблице в
[docs/dev/w3c-polyfills.md](../dev/w3c-polyfills.md).

### Подключение

Opt-in в `aurobore.config`:

```json
{ "web": { "polyfills": true } }
```

или явный список: `["geolocation", "share", "notification", "clipboard", "mediaDevices"]`
(`true` = только 4 лёгких, без `mediaDevices`).

Сборка копирует `aurobore-polyfills.js` в `html/js/`, инжектит `<script>` с атрибутом
`data-polyfills="…"` (CSV выбранного набора) и рантайм-IIFE ставит только перечисленные адаптеры.

### Camera / getUserMedia (engine-first)

`getUserMedia` — API движка WebView. Стратегия **engine-first, plugin-fallback**: если движок отдаёт
поток сам (при media-permission), полифил не нужен (feature-detection). Camera-fallback (live-поток через
бинарный канал кадров, FR-B7, [ADR-011](../adr/ADR-011-camera-frame-channel.md)) реализуется **только по
результатам device-спайка** (`V-webview-getusermedia`). Аудио (`audio: true`) в v1 — `NotFoundError`.

### Non-goals (v1)

- Service Worker notifications, `Notification.actions`, `badge`
- `navigator.clipboard.write()` / `read()` с `ClipboardItem`
- `MediaRecorder`, WebRTC
- Полный `getUserMedia` audio

## Альтернативы

1. **Встроить в `@aurobore/core`** — отвергнут: раздувает core, усложняет tree-shaking; полифилы опциональны.
2. **Только документация «замените API»** — отвергнут: не достигает G1.
3. **Полная спецификация W3C** — отвергнут: неоправданная стоимость; достаточный subset покрывает целевые SPA.

## Влияние и совместимость

- Обратная совместимость: по умолчанию полифилы **выключены**.
- Безопасность: те же permissions/scopes, что у плагинов; полифилы не обходят мост.
- Производительность: negligible для invoke-based API; camera stream — отдельный бинарный канал.

## Открытые вопросы

- **Device-спайк `V-webview-getusermedia`:** отдаёт ли движок CEF WebView `getUserMedia` сам и можно ли
  выдать media-permission из натива. Определяет, нужен ли Camera-fallback вообще ([ADR-011](../adr/ADR-011-camera-frame-channel.md)).
- Рендер `<video srcObject>` на конкретной версии CEF WebView — верификация в ADR-011 spike.
- Facing mode / torch на всех устройствах Aurora.

## Итог

Принято. Оформлены [ADR-010](../adr/ADR-010-w3c-polyfills.md) и [ADR-011](../adr/ADR-011-camera-frame-channel.md).
Требование **FR-S6** добавлено в [requirements.md](../requirements.md).
