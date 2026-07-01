# Share

Системный шаринг текста, URL и файлов (resource ref через Asset Loader).

**Пакет:** `@aurobore/share`  
**Разрешения:** нет

> **Статус A3 scaffold:** native-реализация — stub. Все методы возвращают `SHARE_UNAVAILABLE`. Реальный Share UI Авроры — следующая итерация.

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `shareText` | `{ text: string; title?: string }` | `void` | Шаринг текста |
| `shareUrl` | `{ url: string; title?: string }` | `void` | Шаринг ссылки |
| `shareFile` | `{ kind: string; url: string; mimeType?: string; title?: string }` | `void` | Шаринг файла по resource URL |

Для `shareFile` поле `url` — логический URL ресурса (`aurobore-app://localhost/app-data/...`), как у [Camera](camera.md).

## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `SHARE_UNAVAILABLE` | share sheet not available | Stub-режим, нет шаринга на устройстве |
| `SHARE_CANCELLED` | user cancelled | Пользователь отменил шаринг (UI-итерация) |

## Пример

```typescript
import { Share } from "@aurobore/share";
import { isAuroboreError, wrapBridgeError } from "@aurobore/core";

try {
  await Share.shareText({ text: "Hello from Aurobore", title: "Greeting" });
} catch (err) {
  const error = isAuroboreError(err)
    ? err
    : wrapBridgeError(err as { code: string; message: string });
  if (error.code === "SHARE_UNAVAILABLE") {
    console.log("Share not available yet (A3 scaffold)");
  }
}
```

См. также [standard-plugins.md](standard-plugins.md) §3.
