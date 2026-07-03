# Использование плагинов

Как подключить плагин, вызвать типизированный метод и обработать ошибки.

## Добавление плагина

Все built-in плагины доступны в npm (с `@aurobore/cli@^0.0.3`):

| Пакет | Плагин |
|-------|--------|
| `@aurobore/echo` | Echo (conformance) |
| `@aurobore/device` | Device |
| `@aurobore/storage` | Storage |
| `@aurobore/filesystem` | FileSystem |
| `@aurobore/clipboard` | Clipboard |
| `@aurobore/network` | Network |
| `@aurobore/camera` | Camera (A3) |
| `@aurobore/geolocation` | Geolocation (A3) |

Плагины перечисляются в `aurobore.config.json`:

```json
{
  "plugins": ["@aurobore/echo", "@aurobore/device"]
}
```

Добавить через CLI:

```bash
aurobore plugin add device
aurobore plugin list
```

CLI обновляет конфиг, ставит npm-пакет (для built-in), перегенерирует native registry и `aurobore-plugins.js`. Работает **без клонирования монорепо Aurobore**.

## Импорт в коде

Плагины публикуют сгенерированные обёртки из манифеста (ADR-008):

```typescript
import { Echo } from "@aurobore/echo";
import { Device } from "@aurobore/device";

const ping = await Echo.ping({});
const info = await Device.getInfo({});
```

Обёртки вызывают `getAurobore().invoke()` из `@aurobore/core` — мост инжектируется runtime-контейнером.

## Разрешения

Разрешения плагина должны быть в `permissions` конфига приложения.
Справочник плагинов: [plugins/README.md](../plugins/README.md).

## Обработка ошибок

Коды ошибок объявлены в `plugin.manifest` каждого плагина (например `FILESYSTEM_INVALID_PATH`).
Полные таблицы — на странице reference плагина.

Ошибки моста оборачиваются в типизированные классы SDK:

```typescript
import { FileSystem } from "@aurobore/filesystem";
import { isAuroboreError, wrapBridgeError } from "@aurobore/core";

try {
  await FileSystem.readText({ path: "../outside" });
} catch (err) {
  const error = isAuroboreError(err)
    ? err
    : wrapBridgeError(err as { code: string; message: string });

  if (error.code === "FILESYSTEM_INVALID_PATH") {
    // путь вне песочницы или содержит ..
  }
  console.error(error.code, error.message);
}
```

Пример с Echo.fail и `PermissionDeniedError`:

```typescript
import { Echo } from "@aurobore/echo";
import { isAuroboreError, wrapBridgeError, PermissionDeniedError } from "@aurobore/core";

try {
  await Echo.fail({});
} catch (err) {
  const error = isAuroboreError(err)
    ? err
    : wrapBridgeError(err as { code: string; message: string });

  if (error instanceof PermissionDeniedError) {
    // нет разрешения
  }
  console.error(error.code, error.message);
}
```

## Встроенные плагины MVP

| Пакет | Плагин | Назначение |
|---|---|---|
| `@aurobore/echo` | Echo | Conformance-stub, тест моста |
| `@aurobore/device` | Device | Информация об устройстве |
| `@aurobore/storage` | Storage | Key-value хранилище |
| `@aurobore/filesystem` | FileSystem | Файловая система |
| `@aurobore/clipboard` | Clipboard | Буфер обмена |
| `@aurobore/network` | Network | Сетевой статус |

Подробнее по каждому: [plugins/README.md](../plugins/README.md).

## Плагины post-A3 (P1–P5)

| Пакет | Плагин | Demo | Статус native |
|---|---|---|---|
| `@aurobore/camera` | Camera | [camera-demo](../../examples/camera-demo/) | **P1** — pick/capture → `Photo` URL; sign-off на устройстве pending |
| `@aurobore/geolocation` | Geolocation | [geo-demo](../../examples/geo-demo/) | **P2** — GPS watch + getCurrentPosition; sign-off на устройстве pending |
| `@aurobore/sensors` | Sensors | [sensors-demo](../../examples/sensors-demo/) | **P3** — accel/gyro streams; sign-off на устройстве pending |
| `@aurobore/notifications` | Notifications | [notifications-demo](../../examples/notifications-demo/) | **P4** — notify/schedule/cancel + `notification:tap`; sign-off tap на устройстве pending |
| `@aurobore/share` | Share | — | [share-demo](../../examples/share-demo/) (P5) |

См. [plugins/camera.md](../plugins/camera.md), [plugins/geolocation.md](../plugins/geolocation.md), [plugins/sensors.md](../plugins/sensors.md), [plugins/notifications.md](../plugins/notifications.md).

## Написание своего плагина

См. туториал [writing-a-plugin.md](writing-a-plugin.md) (`aurobore plugin create` в проекте приложения).

Для авторов плагинов в монорепо платформы: [dev/adding-a-plugin.md](../dev/adding-a-plugin.md).
