<!-- AUTO-GENERATED from plugins/share/plugin.manifest — do not edit by hand -->

# Share

> Сгенерировано из `plugin.manifest`. Ручной справочник: [plugins/share.md](../../plugins/share.md).

**Пакет:** `@aurobore/share`  
**Разрешения:** нет

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `shareText` | `ShareTextArgs` | — | — |
| `shareUrl` | `ShareUrlArgs` | — | — |
| `shareFile` | `ShareFileArgs` | — | — |

## Типы

### `ShareTextArgs`

| Поле | Тип |
|------|-----|
| `text` | `string` |
| `title` | `string?` |

### `ShareUrlArgs`

| Поле | Тип |
|------|-----|
| `url` | `string` |
| `title` | `string?` |

### `ShareFileArgs`

| Поле | Тип |
|------|-----|
| `kind` | `string` |
| `url` | `string` |
| `mimeType` | `string?` |
| `title` | `string?` |


## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `SHARE_UNAVAILABLE` | share sheet not available | Нет системного шаринга на устройстве или плагин в stub-режиме (A3 scaffold) |
| `SHARE_CANCELLED` | user cancelled | Пользователь отменил шаринг (UI-итерация) |
## Импорт

```typescript
import { Share } from "@aurobore/share";
```
