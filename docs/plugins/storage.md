# Storage

Key-value хранилище в песочнице приложения (in-memory на MVP).

**Пакет:** `@aurobore/storage`  
**Разрешения:** нет

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `get` | `{ key: string }` | `{ value: string }` | Значение по ключу (пустая строка если нет) |
| `set` | `{ key: string; value: string }` | `void` | Записать значение |
| `remove` | `{ key: string }` | `void` | Удалить ключ |
| `keys` | `{}` | `{ keys: string[] }` | Список ключей |
| `clear` | `{}` | `void` | Очистить всё хранилище |

## Типы

| Имя | Поля |
|-----|------|
| `StorageValue` | `value: string` |
| `StorageKeys` | `keys: array` |

## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `STORAGE_INVALID_ARGS` | key required | `get`, `set` или `remove` без непустого `key` |

## Пример

```typescript
import { Storage } from "@aurobore/storage";

await Storage.set({ key: "theme", value: "dark" });
const { value } = await Storage.get({ key: "theme" });
const { keys } = await Storage.keys({});
```
