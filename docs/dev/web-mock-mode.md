# Browser mock mode (`aurobore dev --web`)

Запуск приложения Aurobore в **desktop-браузере** с mock-реализациями плагинов — без Aurora SDK и
эмулятора. Подходит для итераций по UI, вёрстке и JS-логике, когда нативный слой не нужен.

## Запуск

```powershell
aurobore dev --web
```

Флаги:

| Флаг | Описание |
|------|----------|
| `--web` | Browser mock mode: loopback-мост + mock-плагины, без RPM/deploy |
| `--no-open` | Не открывать браузер автоматически (для CI/headless) |
| `--no-run` | Совместим с `--web` (эмулятор и так не запускается) |
| `--port <n>` | Порт dev-сервера (по умолчанию из `aurobore.config`) |

Пример:

```powershell
cd examples/camera-demo
aurobore dev --web
```

CLI поднимает dev-сервер (Vite / esbuild / static), инжектирует bridge-скрипты в HTML и открывает
`http://127.0.0.1:<port>/…` в системном браузере.

## Как это работает

1. **Dev server** — тот же backend, что и `aurobore dev` (HMR/live reload).
2. **Loopback-мост** — `aurobore-bridge-web.js` создаёт in-memory пару транспортов; JS-сторона —
   `window.Aurobore`, native-сторона — mock registry из `@aurobore/core`.
3. **HTML injection** — в `<head>` добавляется `aurobore-chrome.css`, перед `</body>` — bridge-web,
   plugins bundle и `aurobore-web-shim.js` (lifecycle + safe-area insets).
4. **Fixtures** — `Camera.getPhoto` / `pickPhoto` возвращают `ResourceRef` на
   `/app-data/fixtures/photo.jpg`; `resolveResourceUrl` отдаёт URL dev-сервера.

Переключение на эмулятор: `aurobore dev` (без `--web`) — **код приложения менять не нужно**.

## Mock-плагины (все 11 встроенных)

| Плагин | Поведение в `--web` |
|--------|---------------------|
| Echo | Как conformance-stub (ping, echo, streams, sample resource) |
| Cover | setState / setActions / reset → ok |
| Device | `getInfo` → platform `web`, model `Aurobore Web Mock` |
| Storage | In-memory key/value (сессия браузера) |
| FileSystem | In-memory sandbox под `app-data/` |
| Clipboard | copy/paste в памяти |
| Network | `getStatus` → online из `navigator.onLine`, `wifi` |
| Camera | Фикстура JPEG (`fixtures/photo.jpg`) |
| Geolocation | Координаты Москвы (55.7558, 37.6173); `watch` — stream |
| Sensors | Фиксированные accelerometer/gyro readings (stream) |
| Notifications | schedule/notify → `mock-notif-1` |
| Share | no-op (лог в консоль) |

Значения детерминированы; кастомизация через конфиг (`dev.webMocks`) — планируется отдельно.

## Lifecycle и chrome

`aurobore-web-shim.js` эмулирует:

- CSS-переменные `--aurobore-safe-area-*` (top = 32px по умолчанию)
- События `ready`, `systemChrome:insetsChanged`
- `pause` / `resume` при `visibilitychange`

См. [immersive-ui.md](../tutorials/immersive-ui.md).

## Ограничения

- Нет реальной камеры, GPS, share sheet, push-уведомлений ОС.
- Нативные изменения (C++/QML, новые permissions) по-прежнему требуют `aurobore dev` + эмулятор.
- Режим только для разработки; в prod RPM не включается.

## Связи

- Требование: **FR-C12** в [requirements.md](../requirements.md)
- Архитектура: [dev-server.md](../architecture/dev-server.md) § Browser mock mode
- Исходники: `packages/core/src/mocks/`, `packages/bridge-js/src/bundle-web.ts`
