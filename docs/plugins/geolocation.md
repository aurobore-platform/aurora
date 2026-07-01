# Geolocation

Текущая позиция и наблюдение за изменениями через стрим `watch`.

**Пакет:** `@aurobore/geolocation`  
**Разрешения:** `Location`

> **Статус A3 scaffold:** native-реализация — stub. Методы возвращают `GEOLOCATION_UNAVAILABLE`; стрим `watch` завершается с той же ошибкой. Реальный GPS — следующая итерация.

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `getCurrentPosition` | `{ enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }` | `Position` | Однократный запрос координат |
| `watch` | те же аргументы | stream | Подписка на обновления позиции; остановка — `sub.stop()` |
| `clearWatch` | `{ watchId: string }` | `void` | Явная отмена наблюдения по id |

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
| `GEOLOCATION_UNAVAILABLE` | geolocation not available | Stub-режим, нет GPS на устройстве |
| `GEOLOCATION_CANCELLED` | user cancelled | Пользователь отменил запрос (UI-итерация) |

Также возможны ошибки моста: `BRIDGE_PERMISSION_DENIED` (нет `Location` в granted permissions проекта).

## Пример

```typescript
import { Geolocation } from "@aurobore/geolocation";
import { isAuroboreError, wrapBridgeError } from "@aurobore/core";

try {
  const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
  console.log(pos.latitude, pos.longitude);
} catch (err) {
  const error = isAuroboreError(err)
    ? err
    : wrapBridgeError(err as { code: string; message: string });
  if (error.code === "GEOLOCATION_UNAVAILABLE") {
    console.log("Geolocation not available yet (A3 scaffold)");
  }
}

const sub = Geolocation.watch({ enableHighAccuracy: true });
sub.onData = (pos) => console.log(pos);
sub.onError = (err) => console.warn(err);
sub.onComplete = () => console.log("watch ended");
// sub.stop();
```

См. также [standard-plugins.md](standard-plugins.md) §3.
