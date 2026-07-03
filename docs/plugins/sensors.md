# Sensors

Акселерометр и гироскоп как высокочастотные стримы с backpressure на мосту (A1).

**Пакет:** `@aurobore/sensors`  
**Разрешения:** нет (post-A3 — при необходимости motion)

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `watchAccelerometer` | `{}` | stream | Подписка на данные акселерометра; остановка — `sub.stop()` |
| `watchGyroscope` | `{}` | stream | Подписка на данные гироскопа |

Акселерометр и гироскоп — **независимые** подписки; повторный вызов того же метода останавливает предыдущую.

## Типы

### `SensorReading`

| Поле | Тип | Описание |
|------|-----|----------|
| `x` | `number` | Ось X (акселерометр: m/s²; гироскоп: rad/s) |
| `y` | `number` | Ось Y |
| `z` | `number` | Ось Z |
| `timestamp` | `number` | Unix timestamp (мс) на момент доставки reading в JS |

## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `SENSORS_UNAVAILABLE` | sensors not available | Нет сенсора на устройстве, ошибка Qt Sensors, эмулятор без IMU |
| `SENSORS_CANCELLED` | user cancelled | Зарезервировано для UI-итерации; `sub.stop()` завершает стрим без error |

## Поведение на эмуляторе

На x86-эмуляторе без IMU ожидайте `SENSORS_UNAVAILABLE` — это нормально. Sign-off — физическое устройство.

## Пример

```typescript
import { Sensors } from "@aurobore/sensors";

const sub = await Sensors.watchAccelerometer();
sub.onData = (reading) => {
  console.log(reading.x, reading.y, reading.z);
};
sub.onError = (err) => console.warn(err);
sub.onComplete = () => console.log("sensor stream ended");
// sub.stop();
```

Демо: [`examples/sensors-demo`](../../examples/sensors-demo/).

См. также [standard-plugins.md](standard-plugins.md) §3.
