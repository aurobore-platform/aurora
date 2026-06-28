<!-- AUTO-GENERATED from plugins/network/plugin.manifest — do not edit by hand -->

# Network

> Сгенерировано из `plugin.manifest`. Ручной справочник: [plugins/network.md](../../plugins/network.md).

**Пакет:** `@aurobore/network`  
**Разрешения:** Internet

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `getStatus` | `{}` | `NetworkStatus` | — |

## Типы

### `NetworkStatus`

| Поле | Тип |
|------|-----|
| `online` | `boolean` |
| `connectionType` | `string` |

## События

| Событие | Payload | Описание |
|---------|---------|----------|
| `network:change` | `{ online: boolean, connectionType: string }` | — |

## Импорт

```typescript
import { Network } from "@aurobore/network";
```
