# ADR-011: Бинарный канал кадров камеры для getUserMedia (engine-first fallback)

- **Статус:** Proposed (blocked on device spike — см. `V-webview-getusermedia`)
- **Дата:** 2026-07-06
- **Связанные требования:** FR-S6, FR-B7, FR-B6, FR-B8
- **Связанные ADR/RFC:** [RFC-001](../rfc/RFC-001-w3c-polyfills.md), [ADR-010](ADR-010-w3c-polyfills.md), [ADR-002](ADR-002-bridge-model.md)

## Контекст

`navigator.mediaDevices.getUserMedia` — это API **движка** WebView (Chromium/CEF), а не bridge-плагина.
Стратегия: **engine-first, plugin-fallback**.

1. **Engine-first.** Если движок WebView отдаёт `getUserMedia` сам (при выданном media-permission),
   полифил не нужен — он уже уступает нативному через feature-detection
   ([media-devices.ts](../../packages/polyfills/src/media-devices.ts)).
2. **Plugin-fallback.** Camera-канал ниже — резерв на случай, когда движок недоступен или permission
   выдать нельзя. Реализуется **только по результатам спайка** (ниже).

Поэтому `mediaDevices` **исключён из дефолтного набора** полифилов (`web.polyfills: true` → 4 «лёгких»
адаптера) и включается только явным opt-in (`web.polyfills: [..., "mediaDevices"]`). См. [ADR-010](ADR-010-w3c-polyfills.md).

Fallback-механика: `getUserMedia({ video: true })` требует live `MediaStream`. Плагин Camera (P1)
реализует только `getPhoto`/`pickPhoto` (ResourceRef). JSON stream-протокол (geo/sensors) не подходит
для 15–30 fps video (FR-B7 запрещает base64 в JSON для бинарных данных).

## Spike (DoD) — блокирует реализацию

На **устройстве с камерой** (эмулятор x86 отдаёт `CAMERA_UNAVAILABLE`, см. verification-status `V-camera`),
на странице **без полифила**, проверить:

1. Присутствует ли `navigator.mediaDevices.getUserMedia` в движке WebView.
2. Что возвращает вызов `getUserMedia({ video: true })`: поток или reject, и с каким кодом ошибки
   (`NotAllowedError` / `NotFoundError` / …).
3. Можно ли выдать media-permission из нативной части (обёртка `ru.auroraos.WebView` или CEF media-access
   handler в `runtime/container`).

**Резолюция:** Camera-канал (ниже) реализуется **только если** движок getUserMedia недоступен либо
permission выдать нельзя. Если движок первичен — этот ADR остаётся `Proposed`, а `watchPreview` в Camera
остаётся самостоятельным интерфейсом сырых кадров (не путь для getUserMedia).

## Рассмотренные варианты

1. **Отдельный bridge message `type: "binary"` с `subscriptionId` + `ArrayBuffer` (выбран).**
   Расширяет существующую модель подписок; metadata в JSON, payload — бинарный.
2. **Resource URL ring buffer** — отвергнут для v1: latency, GC pressure, сложность AssetResolver.
3. **Полный FR-B9 binary protocol** — отвергнут: слишком широкий scope; минимальный канал достаточен.
4. **JPEG в JSON stream** — отвергнут: нарушает FR-B7, неприемлемая производительность.

## Решение (fallback-контракт, при негативном спайке)

### Протокол

Поверх существующего invoke/stream lifecycle:

```
JS invoke Camera.watchPreview { stream: true, maxFps? }
  → subscriptionId

native → JS (JSON): { type: "stream", subscriptionId, phase: "binary-meta",
  payload: { format: "jpeg"|"rgba", width, height, timestamp, byteLength } }
native → JS (binary): ArrayBuffer (отдельное сообщение, correlated by subscriptionId)

JS cancel(subscriptionId) → native stops camera
```

Транспорт WebView: бинарный payload кодируется как **base64 в отдельном поле `binaryPayload`**
в JSON-сообщении bridge **только для кадров** с `byteLength` ≤ 512 KiB; на JS стороне декодируется
в `ArrayBuffer`. Это компромисс до нативного binary channel в WebView API — документировано как
временная мера с лимитом fps/размера; mock mode использует тот же контракт.

> **Примечание реализации:** если WebView SDK предоставит нативный binary postMessage, миграция
> затронет только transport layer (`bridge-js` / native-sdk), не контракт stream phases.

### Camera plugin

- Новый метод `watchPreview` (`stream: true`): headless `QCamera` + периодический захват кадра.
- Args: `facingMode?`, `width?`, `height?`, `maxFps?` (default 15, cap 30).
- `cancel` останавливает камеру.

### Polyfill

- `getUserMedia({ video })` → `watchPreview` → `MediaStream` с `VideoTrack`.
- Рендер: canvas `drawImage(ImageBitmap)` + `canvas.captureStream(maxFps)` для `<video srcObject>`.
- `audio: true` → `NotFoundError` в v1.

## Последствия

- (+) Реальный live preview в WebView без переписывания SPA.
- (+) Переиспользует stream subscription/cancel/backpressure (FR-B8 `maxFps`).
- (−) Base64 transport — overhead; ограничить quality/fps; планировать native binary в post-1.0.
- (−) Дополнительная native-работа в Camera (P1b).

## Заметки/верификация

- **Блокер:** device-спайк `V-webview-getusermedia` (см. выше) — до него канал не реализуется как путь getUserMedia.
- Эмулятор: `pnpm container:all` + `w3c-demo` camera section (собирается; live camera требует устройства).
- Mock mode: synthetic JPEG frames из `fixtures/photo.jpg`.
- Проверить `QCamera` + image capture на Aurora SDK 5.2.x.
