# Share

Системный шаринг текста, URL и файлов (resource ref через Asset Loader).

**Пакет:** `@aurobore/share`  
**Разрешения:** нет

Native-реализация (P5): `Sailfish.Share` `ShareAction` (`sailfish-components-share-qt5`) + async invoke через `ShareBridge` / `ShareSheetPage.qml`.

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `shareText` | `{ text: string; title?: string }` | `void` | Шаринг текста |
| `shareUrl` | `{ url: string; title?: string }` | `void` | Шаринг ссылки |
| `shareFile` | `{ kind: string; url: string; mimeType?: string; title?: string }` | `void` | Шаринг файла по resource URL |

Для `shareFile` поле `url` — логический URL ресурса (`aurobore-app://localhost/app-data/...`), как у [Camera](camera.md). Файл резолвится в app-data sandbox через `ScopeValidator`.

## Ограничения (Alpha+)

| Сценарий | Поведение |
|----------|-----------|
| Async invoke | Пустой deferred `QVariant` → `emitOutbound` после закрытия share sheet page |
| Завершение | Promise resolve при back/закрытии sheet-page после успешного `ShareAction.trigger()`; явного callback «share completed» от ОС нет |
| Параллельные вызовы | Второй вызов → `SHARE_UNAVAILABLE` (operation in progress) |
| Эмулятор | Share service может быть недоступен → `SHARE_UNAVAILABLE` |

## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-----|
| `SHARE_UNAVAILABLE` | share sheet not available | Нет Share API, пустые args, файл не найден, параллельный вызов |
| `SHARE_CANCELLED` | user cancelled | Back / dismiss до завершения, `cancel()` |

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
  if (error.code === "SHARE_CANCELLED") {
    console.log("User dismissed share sheet");
  }
}
```

`shareFile` с resource из Echo или Camera:

```typescript
import { Echo } from "@aurobore/echo";
import { Share } from "@aurobore/share";

const resource = await Echo.getSampleResource();
await Share.shareFile({
  kind: resource.kind,
  url: resource.url,
  mimeType: resource.mimeType,
});
```

Демо: [`examples/share-demo`](../../examples/share-demo/).

См. также [standard-plugins.md](standard-plugins.md) §3.
