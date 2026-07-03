# Справочник стандартных плагинов

Полное API MVP-плагинов Aurobore: методы, типы, события и **коды ошибок**.

> Обзор и приоритеты: [standard-plugins.md](standard-plugins.md). Контракт плагина: [plugin-api.md](plugin-api.md).

## Каталог MVP

| Плагин | Пакет | Разрешения | Reference |
|--------|-------|------------|-----------|
| Echo | `@aurobore/echo` | — | [echo.md](echo.md) |
| Device | `@aurobore/device` | — | [device.md](device.md) |
| Storage | `@aurobore/storage` | — | [storage.md](storage.md) |
| FileSystem | `@aurobore/filesystem` | — (scope: `appData`) | [filesystem.md](filesystem.md) |
| Clipboard | `@aurobore/clipboard` | — | [clipboard.md](clipboard.md) |
| Network | `@aurobore/network` | `Internet` | [network.md](network.md) |
| Camera | `@aurobore/camera` | `Camera` | [camera.md](camera.md) (P1) |
| Geolocation | `@aurobore/geolocation` | `Location` | [geolocation.md](geolocation.md) (P2) |
| Sensors | `@aurobore/sensors` | — | [sensors.md](sensors.md) (P3) |
| Notifications | `@aurobore/notifications` | `Notifications` | [notifications.md](notifications.md) (A3 stub, P4) |
| Share | `@aurobore/share` | — | [share.md](share.md) (A3 stub, P5) |

## Импорт

```typescript
import { Echo } from "@aurobore/echo";
import { FileSystem } from "@aurobore/filesystem";
```

Типы и методы генерируются из `plugin.manifest` (ADR-008). Коды ошибок объявлены в манифесте как single source of truth.

> **Автогенерируемая версия:** [api/plugins/](../api/plugins/) — из манифестов (`pnpm gen-api-reference`).

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
| `<PLUGIN>_*` | Конкретный плагин | `FILESYSTEM_INVALID_PATH`, `STORAGE_INVALID_ARGS` |

Коды плагина перечислены на странице каждого reference. Общие коды моста — в [api/README.md](../api/README.md).

## Примеры

- [examples/hello-world/](../../examples/hello-world/) — Echo, Device, lifecycle
- [examples/camera-demo/](../../examples/camera-demo/) — Camera (P1)
- [examples/geo-demo/](../../examples/geo-demo/) — Geolocation (P2)
- [examples/sensors-demo/](../../examples/sensors-demo/) — Sensors (P3)
- [docs/tutorials/using-plugins.md](../tutorials/using-plugins.md) — добавление плагинов в проект
