# W3C API polyfills (FR-S6)

Опциональный слой `@aurobore/polyfills` маппит стандартные браузерные API на плагины Aurobore.
Цель — перенос SPA/PWA **без изменения кода** (vision G1).

См. [RFC-001](https://github.com/aurobore-platform/aurora/blob/main/docs/rfc/RFC-001-w3c-polyfills.md), [ADR-010](https://github.com/aurobore-platform/aurora/blob/main/docs/adr/ADR-010-w3c-polyfills.md).

## Подключение

В `aurobore.config.json`:

```json
{
  "web": {
    "polyfills": true
  }
}
```

`polyfills: true` включает **дефолтный набор из 4 «лёгких» адаптеров**:
`geolocation`, `share`, `notification`, `clipboard`. **`mediaDevices` (getUserMedia) в дефолт не входит** —
это API движка (engine-first), включается только явным opt-in:

```json
{ "web": { "polyfills": ["geolocation", "clipboard", "mediaDevices"] } }
```

Скрипты в HTML (после bridge и plugins); тег несёт выбранный набор в `data-polyfills`:

```html
<script src="js/aurobore-bridge.js"></script>
<script src="js/aurobore-plugins.js"></script>
<script src="js/aurobore-polyfills.js" data-aurobore-polyfills="1" data-polyfills="geolocation,clipboard,mediaDevices"></script>
```

При `aurobore build` скрипт и тег инжектятся автоматически, если polyfills включены; рантайм-IIFE читает
`data-polyfills` и ставит только перечисленные адаптеры (без атрибута → дефолтные 4).

## Маппинг API

| W3C API | Плагин | Примечания |
|---------|--------|------------|
| `navigator.geolocation` | Geolocation | `getCurrentPosition`, `watchPosition`, `clearWatch` |
| `navigator.share` / `canShare` | Share | `text`, `url`, `files[0]` |
| `Notification` | Notifications | `requestPermission` → `granted`; без SW/actions |
| `navigator.clipboard` | Clipboard | `readText` / `writeText` only |
| `navigator.mediaDevices.getUserMedia` | engine-first (opt-in) | движок первичен; Camera-fallback заблокирован на спайк; audio → `NotFoundError` |

## Ошибки (FR-S3 → W3C)

| Код Aurobore | W3C |
|--------------|-----|
| `BRIDGE_PERMISSION_DENIED`, `*_CANCELLED` | `NotAllowedError` / Position code 1 |
| `BRIDGE_TIMEOUT` | `TimeoutError` / Position code 3 |
| `GEOLOCATION_UNAVAILABLE`, `CAMERA_UNAVAILABLE` | `NotFoundError` / Position code 2 |
| `CAMERA_CAPTURE_FAILED` | `NotReadableError` |

## Деградация

- Polyfills **не патчат** API, если нативная реализация уже есть в WebView.
- Bootstrap не бросает исключений; ошибки — при вызове методов.

## Camera / getUserMedia (engine-first)

`getUserMedia` — API **движка** WebView, не bridge-плагина. Стратегия **engine-first, plugin-fallback**:

1. Полифил не патчит `getUserMedia`, если движок его уже отдаёт (feature-detection). Если движок
   поддерживает камеру при выданном media-permission — polyfill не нужен.
2. `mediaDevices` — **только явный opt-in** (`web.polyfills: [..., "mediaDevices"]`), не в дефолте.
3. **Fallback** через `Camera.watchPreview` (stream → JPEG-кадры в `binaryPayload`, base64) и
   `canvas.captureStream()` для `<video srcObject>` — **заблокирован на device-спайк**
   `V-webview-getusermedia` (см. [ADR-011](https://github.com/aurobore-platform/aurora/blob/main/docs/adr/ADR-011-camera-frame-channel.md) §Spike и
   [verification-status](../aurora/verification-status.md)). Эмулятор x86 отдаёт `CAMERA_UNAVAILABLE` —
   проверять только на устройстве с камерой.

Mock mode (`dev --web`): синтетические кадры из fixture (для отладки контракта, не решает спайк).

## Демо

```powershell
cd examples/w3c-demo
pnpm build:web
aurobore dev --web
```

Пример использует **только** `navigator.*` и `Notification` — без `@aurobore/*` imports.

## Non-goals (v1)

- Service Worker notifications, `Notification.actions`
- `clipboard.read()` / `write()` с `ClipboardItem`
- `getUserMedia` audio, `MediaRecorder`, WebRTC
