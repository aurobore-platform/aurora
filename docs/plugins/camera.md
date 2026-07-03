# Camera

Съёмка фото и выбор из галереи. Возвращает **URL ресурса** (`Photo`) через Asset Loader — не байты в JSON.

**Пакет:** `@aurobore/camera`  
**Разрешения:** `Camera`

Native: `getPhoto` открывает UI съёмки (QtMultimedia `Camera`); `pickPhoto` — системный picker (`Sailfish.Pickers` `ImagePickerPage`). Файл копируется в app-data; в JSON только `aurobore-app://localhost/app-data/...`.

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `getPhoto` | `{ quality?: number; allowEditing?: boolean }` | `Photo` | Съёмка с камеры |
| `pickPhoto` | `{ allowEditing?: boolean }` | `Photo` | Выбор из галереи |

### Ограничения

| Аргумент | Поведение |
|----------|-----------|
| `quality` (0–100) | Перекодирование в JPEG при сохранении в app-data; по умолчанию 80. Только для `getPhoto`. |
| `allowEditing` | Зарезервировано; редактирование после выбора пока не реализовано (no-op). |

На **эмуляторе без камеры** `getPhoto` возвращает `CAMERA_UNAVAILABLE`. `pickPhoto` работает, если в образе доступна галерея.

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
| `CAMERA_UNAVAILABLE` | camera or gallery not available | Нет камеры/галереи, `CameraBridge` недоступен |
| `CAMERA_CANCELLED` | user cancelled | Пользователь отменил операцию или `cancel()` |
| `CAMERA_CAPTURE_FAILED` | capture failed | Ошибка съёмки, записи в app-data, или параллельный вызов |

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
    console.log("Camera not available on this device");
  }
}
```

См. также [standard-plugins.md](standard-plugins.md) §3.
