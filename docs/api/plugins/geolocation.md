<!-- AUTO-GENERATED from plugins/geolocation/plugin.manifest — do not edit by hand -->

# Geolocation

> Сгенерировано из `plugin.manifest`. Ручной справочник: [plugins/geolocation.md](../../plugins/geolocation.md).

**Пакет:** `@aurobore/geolocation`  
**Разрешения:** Location

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `getCurrentPosition` | `GetCurrentPositionArgs` | `Position` | — |
| `watch` | `WatchArgs` | stream | — |
| `clearWatch` | `ClearWatchArgs` | — | — |

## Типы

### `Position`

| Поле | Тип |
|------|-----|
| `latitude` | `number` |
| `longitude` | `number` |
| `accuracy` | `number?` |
| `altitude` | `number?` |
| `altitudeAccuracy` | `number?` |
| `heading` | `number?` |
| `speed` | `number?` |
| `timestamp` | `number` |

### `GetCurrentPositionArgs`

| Поле | Тип |
|------|-----|
| `enableHighAccuracy` | `boolean?` |
| `timeout` | `number?` |
| `maximumAge` | `number?` |

### `WatchArgs`

| Поле | Тип |
|------|-----|
| `enableHighAccuracy` | `boolean?` |
| `timeout` | `number?` |
| `maximumAge` | `number?` |

### `ClearWatchArgs`

| Поле | Тип |
|------|-----|
| `watchId` | `string` |


## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `GEOLOCATION_UNAVAILABLE` | geolocation not available | Нет GPS/геолокации на устройстве или источник позиции недоступен |
| `GEOLOCATION_CANCELLED` | user cancelled | Пользователь отменил запрос геолокации (UI-итерация) |
## Импорт

```typescript
import { Geolocation } from "@aurobore/geolocation";
```
