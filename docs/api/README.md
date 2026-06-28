# API Reference (MVP)

Краткий справочник публичного SDK `@aurobore/core` и пакетов плагинов.

> Архитектура: [typescript-sdk.md](../architecture/typescript-sdk.md).

## `@aurobore/core`

### Мост

| Функция | Описание |
|---|---|
| `getAurobore()` | Возвращает активный мост (`globalThis.Aurobore` или bound) |
| `invoke(plugin, method, args?, options?)` | Вызов нативного метода → `Promise` |
| `on(name, handler)` | Подписка на событие; возвращает `unsubscribe` |
| `once(name, handler)` | Одноразовая подписка |
| `off(name, handler)` | Отписка |
| `emit(name, data?)` | Событие JS → native |
| `assertBridgeReady()` | Бросает, если мост недоступен |
| `bindAurobore(bridge)` | Подмена моста (тесты) |

### Lifecycle-события

Тип `LifecycleEvent`: `ready` | `pause` | `resume` | `backbutton` | `memoryWarning` | `orientationchange` | `destroy`.

### Ошибки

| Класс | Код |
|---|---|
| `AuroboreError` | базовый |
| `PermissionDeniedError` | `BRIDGE_PERMISSION_DENIED` |
| `TimeoutError` | `BRIDGE_TIMEOUT` |
| `CancelledError` | `BRIDGE_CANCELLED` |
| `PluginNotFoundError` | `BRIDGE_PLUGIN_NOT_FOUND` |
| `MethodNotFoundError` | `BRIDGE_METHOD_NOT_FOUND` |
| `InvalidArgsError` | `BRIDGE_INVALID_ARGS` |
| `ProtocolMismatchError` | `BRIDGE_PROTOCOL_MISMATCH` |

Утилиты: `wrapBridgeError(err)`, `isAuroboreError(value)`.

### Совместимость

`checkBridgeProtocol(expected?)` — проверка `globalThis.Aurobore.__protocolVersion`.

### Стримы

```typescript
interface StreamSubscription {
  subscriptionId: string;
  onData: (payload: unknown) => void;
  onError: (error: BridgeError) => void;
  onComplete: () => void;
  stop: () => void;
}
```

### Протокол (низкий уровень)

Экспортируются типы сообщений, `BRIDGE_PROTOCOL_VERSION`, `BRIDGE_ERROR_CODES`, фабрики сообщений — для тестов и инструментов.

## Пакеты плагинов

Каждый `@aurobore/<name>` экспортирует объект с методами из манифеста:

```typescript
import { Device } from "@aurobore/device";
import { Echo } from "@aurobore/echo";
```

Каталог: [standard-plugins.md](../plugins/standard-plugins.md).
Контракт плагина: [plugin-api.md](../plugins/plugin-api.md).

## CLI

| Команда | Описание |
|---|---|
| `aurobore create` | Новый проект из шаблона |
| `aurobore dev` | Dev server + эмулятор |
| `aurobore build` | Web + native RPM |
| `aurobore run` | Деплой и запуск |
| `aurobore plugin add/list/remove` | Управление плагинами |
| `aurobore doctor` | Проверка окружения |

Подробнее: [cli.md](../architecture/cli.md).

## Написание плагина

Платформенный гайд: [dev/adding-a-plugin.md](../dev/adding-a-plugin.md).
