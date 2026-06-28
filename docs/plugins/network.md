# Network

Статус сетевого подключения.

**Пакет:** `@aurobore/network`  
**Разрешения:** `Internet` (в `aurobore.config.json`)

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `getStatus` | `{}` | `NetworkStatus` | Текущий online/offline и тип соединения |

## События

Подписка через `@aurobore/core`:

| Событие | Данные | Описание |
|---------|--------|----------|
| `network:change` | `{ online: boolean; connectionType: string }` | Смена online-состояния |

`connectionType`: `"unknown"` при online, `"none"` при offline (MVP).

## Типы

### `NetworkStatus`

| Поле | Тип |
|------|-----|
| `online` | `boolean` |
| `connectionType` | `string` |

## Коды ошибок

Plugin-specific кодов нет. Возможны ошибки моста (`BRIDGE_*`).

## Пример

```typescript
import { Network } from "@aurobore/network";
import { on } from "@aurobore/core";

const status = await Network.getStatus({});
console.log(status.online, status.connectionType);

const off = on("network:change", (data) => {
  const s = data as { online: boolean; connectionType: string };
  console.log("network:", s.online);
});
// off() — отписаться
```

См. [events-and-lifecycle.md](../tutorials/events-and-lifecycle.md).
