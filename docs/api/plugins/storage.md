<!-- AUTO-GENERATED from plugins/storage/plugin.manifest — do not edit by hand -->

# Storage

> Сгенерировано из `plugin.manifest`. Ручной справочник: [plugins/storage.md](../../plugins/storage.md).

**Пакет:** `@aurobore/storage`  
**Разрешения:** нет

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `get` | `{ key: string }` | `StorageValue` | — |
| `set` | `{ key: string; value: string }` | — | — |
| `remove` | `{ key: string }` | — | — |
| `keys` | `{}` | `StorageKeys` | — |
| `clear` | `{}` | — | — |

## Типы

### `StorageValue`

| Поле | Тип |
|------|-----|
| `value` | `string` |

### `StorageKeys`

| Поле | Тип |
|------|-----|
| `keys` | `array` |


## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `STORAGE_INVALID_ARGS` | key required | Методы get, set, remove вызваны без непустого аргумента key |
## Импорт

```typescript
import { Storage } from "@aurobore/storage";
```
