# Справочник стандартных плагинов

Полное API официальных плагинов Aurobore: методы, типы, события и **коды ошибок**.

> Онлайн: [aurobore-platform.github.io/aurora/plugins/](https://aurobore-platform.github.io/aurora/plugins/)  
> Обзор и приоритеты: [standard-plugins.md](standard-plugins.md). Контракт плагина: [plugin-api.md](plugin-api.md).

## Каталог

| Плагин | Пакет | Разрешения | Reference |
|--------|-------|------------|-----------|
| Echo | `@aurobore/echo` | — | [echo.md](echo.md) |
| Device | `@aurobore/device` | — | [device.md](device.md) |
| Storage | `@aurobore/storage` | — | [storage.md](storage.md) |
| FileSystem | `@aurobore/filesystem` | — (scope: `appData`) | [filesystem.md](filesystem.md) |
| Clipboard | `@aurobore/clipboard` | — | [clipboard.md](clipboard.md) |
| Network | `@aurobore/network` | `Internet` | [network.md](network.md) |
| Camera | `@aurobore/camera` | `Camera` | [camera.md](camera.md) |
| Geolocation | `@aurobore/geolocation` | `Location` | [geolocation.md](geolocation.md) |
| Notifications | `@aurobore/notifications` | `Notifications` | [notifications.md](notifications.md) |
| Share | `@aurobore/share` | — | [share.md](share.md) |
| Sensors | `@aurobore/sensors` | — | [sensors.md](sensors.md) |

Все пакеты публикуются в npm и подключаются через `aurobore plugin add <name>`.
Демо: [`examples/camera-demo/`](../../examples/camera-demo/), [`geo-demo`](../../examples/geo-demo/),
[`notifications-demo`](../../examples/notifications-demo/), [`share-demo`](../../examples/share-demo/),
[`sensors-demo`](../../examples/sensors-demo/).

## Импорт

```typescript
import { Echo } from "@aurobore/echo";
import { FileSystem } from "@aurobore/filesystem";
import { Camera } from "@aurobore/camera";
```

Типы и методы генерируются из `plugin.manifest`. Коды ошибок объявлены в манифесте как single source of truth.

## Обработка ошибок

Вызов метода плагина возвращает `Promise`. При ошибке Promise **reject** с объектом `BridgeError`:

```typescript
interface BridgeError {
  code: string;    // например FILESYSTEM_INVALID_PATH
  message: string;
  data?: unknown;
}
```

В SDK используйте `wrapBridgeError()` и `isAuroboreError()` из `@aurobore/core`:

```typescript
import { isAuroboreError, wrapBridgeError } from "@aurobore/core";
import { FileSystem } from "@aurobore/filesystem";

try {
  await FileSystem.readText({ path: "../secret" });
} catch (err) {
  const error = isAuroboreError(err)
    ? err
    : wrapBridgeError(err as { code: string; message: string });
  if (error.code === "FILESYSTEM_INVALID_PATH") {
    // путь вне песочницы или содержит ..
  }
}
```

### Уровни кодов

| Префикс | Источник | Примеры |
|---------|----------|---------|
| `BRIDGE_*` | Мост / Plugin Manager | `BRIDGE_TIMEOUT`, `BRIDGE_PERMISSION_DENIED`, `BRIDGE_METHOD_NOT_FOUND` |
| `<PLUGIN>_*` | Конкретный плагин | `FILESYSTEM_INVALID_PATH`, `CAMERA_UNAVAILABLE` |

Коды плагина перечислены на странице каждого reference. Общие коды моста — в [api/README.md](../api/README.md).

## Примеры

- [examples/hello-world/](../../examples/hello-world/) — Echo, Device, lifecycle
- [examples/camera-demo/](../../examples/camera-demo/) — Camera
- [examples/geo-demo/](../../examples/geo-demo/) — Geolocation
- [examples/sensors-demo/](../../examples/sensors-demo/) — Sensors
- [examples/notifications-demo/](../../examples/notifications-demo/) — Notifications
- [examples/share-demo/](../../examples/share-demo/) — Share
- [docs/tutorials/using-plugins.md](../tutorials/using-plugins.md) — добавление плагинов в проект
