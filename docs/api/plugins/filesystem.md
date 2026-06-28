<!-- AUTO-GENERATED from plugins/filesystem/plugin.manifest — do not edit by hand -->

# FileSystem

> Сгенерировано из `plugin.manifest`. Ручной справочник: [plugins/filesystem.md](../../plugins/filesystem.md).

**Пакет:** `@aurobore/filesystem`  
**Разрешения:** нет; scope: `appData`

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `readText` | `{ path: string }` | `FsText` | — |
| `writeText` | `{ path: string; text: string }` | — | — |
| `exists` | `{ path: string }` | `FsExists` | — |
| `mkdir` | `{ path: string }` | — | — |
| `delete` | `{ path: string }` | — | — |
| `list` | `{ path: string }` | `FsList` | — |

## Типы

### `FsText`

| Поле | Тип |
|------|-----|
| `text` | `string` |

### `FsExists`

| Поле | Тип |
|------|-----|
| `exists` | `boolean` |

### `FsList`

| Поле | Тип |
|------|-----|
| `entries` | `array` |


## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `FILESYSTEM_INVALID_PATH` | Invalid or blocked path | Пустой path или содержит `..` |
| `FILESYSTEM_UNAVAILABLE` | App data directory unavailable | Не удалось получить или создать каталог AppDataLocation |
| `FILESYSTEM_PERMISSION_DENIED` | Path outside app data scope | Разрешённый путь выходит за пределы песочницы appData |
| `FILESYSTEM_NOT_FOUND` | File or directory not found | readText: файл не существует; list: каталог не существует |
| `FILESYSTEM_IO_ERROR` | Filesystem I/O error | Ошибка чтения, записи, создания каталога или удаления |
## Импорт

```typescript
import { FileSystem } from "@aurobore/filesystem";
```
