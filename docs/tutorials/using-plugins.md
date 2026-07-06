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
| `@aurobore/camera` | Camera |
| `@aurobore/geolocation` | Geolocation |
| `@aurobore/notifications` | Notifications |
| `@aurobore/share` | Share |
| `@aurobore/sensors` | Sensors |

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

## Встроенные плагины

| Пакет | Плагин | Назначение | Демо |
|---|---|---|---|
| `@aurobore/echo` | Echo | Conformance-stub, тест моста | [hello-world](../../examples/hello-world/) |
| `@aurobore/device` | Device | Информация об устройстве | hello-world |
| `@aurobore/storage` | Storage | Key-value хранилище | — |
| `@aurobore/filesystem` | FileSystem | Файловая система (scope `appData`) | — |
| `@aurobore/clipboard` | Clipboard | Буфер обмена | — |
| `@aurobore/network` | Network | Сетевой статус | — |
| `@aurobore/camera` | Camera | Фото / галерея → URL ресурса | [camera-demo](../../examples/camera-demo/) |
| `@aurobore/geolocation` | Geolocation | Позиция и `watch` | [geo-demo](../../examples/geo-demo/) |
| `@aurobore/notifications` | Notifications | Локальные уведомления | [notifications-demo](../../examples/notifications-demo/) |
| `@aurobore/share` | Share | Системный шаринг | [share-demo](../../examples/share-demo/) |
| `@aurobore/sensors` | Sensors | Акселерометр / гироскоп (стримы) | [sensors-demo](../../examples/sensors-demo/) |

Подробнее по каждому: [plugins/README.md](../plugins/README.md).

## Написание своего плагина

См. туториал [writing-a-plugin.md](writing-a-plugin.md) (`aurobore plugin create` в проекте приложения).

Для авторов плагинов в монорепо платформы: [dev/adding-a-plugin.md](../dev/adding-a-plugin.md).
