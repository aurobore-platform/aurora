# Clipboard

Буфер обмена (текст).

**Пакет:** `@aurobore/clipboard`  
**Разрешения:** нет

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `copy` | `{ text: string }` | `void` | Записать текст в буфер |
| `paste` | `{}` | `{ text: string }` | Прочитать текст из буфера |

## Типы

### `ClipboardText`

| Поле | Тип |
|------|-----|
| `text` | `string` |

## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `CLIPBOARD_UNAVAILABLE` | Clipboard not available | `QClipboard` недоступен (headless, ранний старт до GUI) |

## Пример

```typescript
import { Clipboard } from "@aurobore/clipboard";

await Clipboard.copy({ text: "Hello Aurora" });
const { text } = await Clipboard.paste({});
```
