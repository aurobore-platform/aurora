# Geolocation

Текущая позиция и наблюдение за изменениями через стрим `watch`.

**Пакет:** `@aurobore/geolocation`  
**Разрешения:** `Location`  
**Native:** Qt5 `QGeoPositionInfoSource` / GeoClue (`qt5-qtpositioning`)

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `getCurrentPosition` | `{ enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }` | `Position` | Однократный запрос координат (async) |
| `watch` | те же аргументы | stream | Подписка на обновления позиции; остановка — `sub.stop()` |
| `clearWatch` | `{ watchId: string }` | `void` | Явная отмена наблюдения по id |

### `watchId` и `subscriptionId`

`watchId` в `clearWatch` — это тот же id, что `subscriptionId` в объекте подписки, возвращённом `watch()`. Оба пути отмены (`sub.stop()` и `clearWatch`) останавливают native GPS.

### Аргументы запроса

| Поле | Описание |
|------|----------|
| `enableHighAccuracy` | `true` — предпочитать спутниковый GPS; `false` — все доступные методы (по умолчанию) |
| `timeout` | Таймаут однократного запроса (мс); `0` — без явного таймера на стороне плагина |
| `maximumAge` | Допустимый возраст кэша (мс) для `lastKnownPosition`; при валидном кэше ответ мгновенный |

## Типы

### `Position`

| Поле | Тип | Описание |
|------|-----|----------|
| `latitude` | `number` | Широта (градусы) |
| `longitude` | `number` | Долгота (градусы) |
| `accuracy` | `number?` | Точность в метрах |
| `altitude` | `number?` | Высота над уровнем моря (м) |
| `altitudeAccuracy` | `number?` | Точность высоты (м) |
| `heading` | `number?` | Направление (градусы) |
| `speed` | `number?` | Скорость (м/с) |
| `timestamp` | `number` | Unix timestamp (мс) |

## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `GEOLOCATION_UNAVAILABLE` | geolocation not available | Нет источника позиции, таймаут, ошибка GeoClue/GPS |
| `GEOLOCATION_CANCELLED` | user cancelled | Отмена через `cancel` во время `getCurrentPosition` |

Также возможны ошибки моста: `BRIDGE_PERMISSION_DENIED` (нет `Location` в granted permissions проекта).

На эмуляторе x86 без mock GPS ожидайте `GEOLOCATION_UNAVAILABLE` — это нормально.

## Пример

```typescript
import { Geolocation } from "@aurobore/geolocation";
import { isAuroboreError, wrapBridgeError } from "@aurobore/core";

try {
  const pos = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 30_000,
  });
  console.log(pos.latitude, pos.longitude);
} catch (err) {
  const error = isAuroboreError(err)
    ? err
    : wrapBridgeError(err as { code: string; message: string });
  if (error.code === "GEOLOCATION_UNAVAILABLE") {
    console.log("GPS not available");
  }
}

const sub = await Geolocation.watch({ enableHighAccuracy: true });
sub.onData = (pos) => console.log(pos);
sub.onError = (err) => console.warn(err);
sub.onComplete = () => console.log("watch ended");
// sub.stop();
// await Geolocation.clearWatch({ watchId: sub.subscriptionId });
```

См. также [standard-plugins.md](standard-plugins.md) §3.
