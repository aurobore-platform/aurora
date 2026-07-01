# Sensors

Акселерометр и гироскоп как высокочастотные стримы с backpressure на мосту (A1).

**Пакет:** `@aurobore/sensors`  
**Разрешения:** нет (post-A3 — при необходимости motion)

> **Статус A3 scaffold:** native-реализация — stub. Стримы `watchAccelerometer` и `watchGyroscope` завершаются с `SENSORS_UNAVAILABLE`. Реальные сенсоры Qt — следующая итерация.

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `watchAccelerometer` | `{}` | stream | Подписка на данные акселерометра; остановка — `sub.stop()` |
| `watchGyroscope` | `{}` | stream | Подписка на данные гироскопа |

## Типы

### `SensorReading`

| Поле | Тип | Описание |
|------|-----|----------|
| `x` | `number` | Ось X |
| `y` | `number` | Ось Y |
| `z` | `number` | Ось Z |
| `timestamp` | `number` | Unix timestamp (мс) |

## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `SENSORS_UNAVAILABLE` | sensors not available | Stub-режим, нет сенсоров на устройстве |

## Пример

```typescript
import { Sensors } from "@aurobore/sensors";

const sub = Sensors.watchAccelerometer();
sub.onData = (reading) => {
  console.log(reading.x, reading.y, reading.z);
};
sub.onError = (err) => console.warn(err);
sub.onComplete = () => console.log("sensor stream ended");
// sub.stop();
```

См. также [standard-plugins.md](standard-plugins.md) §3.
