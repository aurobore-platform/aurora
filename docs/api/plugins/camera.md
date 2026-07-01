<!-- AUTO-GENERATED from plugins/camera/plugin.manifest — do not edit by hand -->

# Camera

> Сгенерировано из `plugin.manifest`. Ручной справочник: [plugins/camera.md](../../plugins/camera.md).

**Пакет:** `@aurobore/camera`  
**Разрешения:** Camera

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `getPhoto` | `GetPhotoArgs` | `Photo` | — |
| `pickPhoto` | `PickPhotoArgs` | `Photo` | — |

## Типы

### `Photo`

| Поле | Тип |
|------|-----|
| `kind` | `string` |
| `url` | `string` |
| `mimeType` | `string?` |
| `size` | `number?` |
| `width` | `number?` |
| `height` | `number?` |
| `format` | `string?` |

### `GetPhotoArgs`

| Поле | Тип |
|------|-----|
| `quality` | `number?` |
| `allowEditing` | `boolean?` |

### `PickPhotoArgs`

| Поле | Тип |
|------|-----|
| `allowEditing` | `boolean?` |


## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `CAMERA_UNAVAILABLE` | camera or gallery not available | Нет камеры/галереи на устройстве или плагин в stub-режиме (A3 scaffold) |
| `CAMERA_CANCELLED` | user cancelled | Пользователь отменил съёмку или выбор из галереи |
| `CAMERA_CAPTURE_FAILED` | capture failed | Ошибка при съёмке или сохранении фото в app-data |
## Импорт

```typescript
import { Camera } from "@aurobore/camera";
```
