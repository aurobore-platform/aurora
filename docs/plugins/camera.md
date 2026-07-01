# Camera

Съёмка фото и выбор из галереи. Возвращает **URL ресурса** (`Photo`) через Asset Loader — не байты в JSON.

**Пакет:** `@aurobore/camera`  
**Разрешения:** `Camera`

> **Статус A3 scaffold:** native-реализация — stub. Методы `getPhoto` и `pickPhoto` возвращают `CAMERA_UNAVAILABLE`. Реальный UI (камера / `Sailfish.Pickers`) — следующая итерация.

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `getPhoto` | `{ quality?: number; allowEditing?: boolean }` | `Photo` | Съёмка с камеры |
| `pickPhoto` | `{ allowEditing?: boolean }` | `Photo` | Выбор из галереи |

## Типы

### `Photo`

| Поле | Тип | Описание |
|------|-----|----------|
| `kind` | `string` | Всегда `"resource"` |
| `url` | `string` | Логический URL: `aurobore-app://localhost/app-data/...` |
| `mimeType` | `string?` | MIME, например `image/jpeg` |
| `size` | `number?` | Размер в байтах |
| `width` | `number?` | Ширина в пикселях |
| `height` | `number?` | Высота в пикселях |
| `format` | `string?` | Формат файла, например `jpeg` |

Для отображения в WebView преобразуйте URL через `resolveResourceUrl()` из `@aurobore/core` (loopback origin контейнера).

## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `CAMERA_UNAVAILABLE` | camera or gallery not available | Stub-режим, нет камеры/галереи на устройстве |
| `CAMERA_CANCELLED` | user cancelled | Пользователь отменил операцию (UI-итерация) |
| `CAMERA_CAPTURE_FAILED` | capture failed | Ошибка съёмки или записи в app-data (UI-итерация) |

Также возможны ошибки моста: `BRIDGE_PERMISSION_DENIED` (нет `Camera` в granted permissions проекта).

## Пример

```typescript
import { Camera } from "@aurobore/camera";
import { isAuroboreError, resolveResourceUrl, wrapBridgeError } from "@aurobore/core";

try {
  const photo = await Camera.getPhoto({ quality: 80 });
  const src = resolveResourceUrl(photo);
  document.querySelector("img")!.setAttribute("src", src);
} catch (err) {
  const error = isAuroboreError(err)
    ? err
    : wrapBridgeError(err as { code: string; message: string });
  if (error.code === "CAMERA_UNAVAILABLE") {
    console.log("Camera not available yet (A3 scaffold)");
  }
}
```

См. также [standard-plugins.md](standard-plugins.md) §3.
