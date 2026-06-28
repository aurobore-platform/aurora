# Использование плагинов

Как подключить плагин, вызвать типизированный метод и обработать ошибки.

## Добавление плагина

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

CLI обновляет конфиг, перегенерирует native registry и `aurobore-plugins.js`.

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

## Написание своего плагина

Для авторов плагинов в монорепо платформы см. [dev/adding-a-plugin.md](../dev/adding-a-plugin.md).
App-facing tutorial по созданию плагина — на этапе Alpha.
