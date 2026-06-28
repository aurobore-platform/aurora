# FileSystem

Работа с файлами в каталоге данных приложения (песочница).

**Пакет:** `@aurobore/filesystem`  
**Разрешения:** нет  
**Scope:** `appData` — все пути **относительные** к `AppDataLocation`

## Ограничения путей

- Путь передаётся как относительный: `"config/settings.json"`, не абсолютный.
- Запрещены `..` и пустой path (кроме косвенной проверки в `exists`).
- Разрешён только каталог внутри `AppDataLocation` ОС; выход за границу → `FILESYSTEM_PERMISSION_DENIED`.

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `readText` | `{ path: string }` | `{ text: string }` | Прочитать файл как UTF-8 |
| `writeText` | `{ path: string; text: string }` | `void` | Записать файл (создаёт родительские каталоги) |
| `exists` | `{ path: string }` | `{ exists: boolean }` | Проверить файл или каталог |
| `mkdir` | `{ path: string }` | `void` | Создать каталог (рекурсивно) |
| `delete` | `{ path: string }` | `void` | Удалить файл или каталог |
| `list` | `{ path: string }` | `{ entries: string[] }` | Имена записей в каталоге |

## Типы

| Имя | Поля |
|-----|------|
| `FsText` | `text: string` |
| `FsExists` | `exists: boolean` |
| `FsList` | `entries: array` |

## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `FILESYSTEM_INVALID_PATH` | Invalid or blocked path | Пустой `path` или содержит `..` |
| `FILESYSTEM_UNAVAILABLE` | App data directory unavailable | Нет `AppDataLocation` или не удалось создать корень |
| `FILESYSTEM_PERMISSION_DENIED` | Path outside app data scope | Нормализованный путь выходит за песочницу |
| `FILESYSTEM_NOT_FOUND` | File or directory not found | `readText`: файл не найден; `list`: каталог не найден |
| `FILESYSTEM_IO_ERROR` | Filesystem I/O error | Ошибка open/read/write/mkdir/delete |

## Пример

```typescript
import { FileSystem } from "@aurobore/filesystem";
import { wrapBridgeError, isAuroboreError } from "@aurobore/core";

await FileSystem.writeText({ path: "notes/hello.txt", text: "Hello" });
const { text } = await FileSystem.readText({ path: "notes/hello.txt" });

try {
  await FileSystem.readText({ path: "../../../etc/passwd" });
} catch (err) {
  const e = isAuroboreError(err) ? err : wrapBridgeError(err as { code: string; message: string });
  // e.code === "FILESYSTEM_INVALID_PATH"
}
```
