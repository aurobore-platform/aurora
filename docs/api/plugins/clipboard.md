<!-- AUTO-GENERATED from plugins/clipboard/plugin.manifest — do not edit by hand -->

# Clipboard

> Сгенерировано из `plugin.manifest`. Ручной справочник: [plugins/clipboard.md](../../plugins/clipboard.md).

**Пакет:** `@aurobore/clipboard`  
**Разрешения:** нет

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `copy` | `{ text: string }` | — | — |
| `paste` | `{}` | `ClipboardText` | — |

## Типы

### `ClipboardText`

| Поле | Тип |
|------|-----|
| `text` | `string` |


## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `CLIPBOARD_UNAVAILABLE` | Clipboard not available | QClipboard недоступен в текущем окружении (headless, ранний старт) |
## Импорт

```typescript
import { Clipboard } from "@aurobore/clipboard";
```
