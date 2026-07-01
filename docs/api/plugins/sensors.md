<!-- AUTO-GENERATED from plugins/sensors/plugin.manifest — do not edit by hand -->

# Sensors

> Сгенерировано из `plugin.manifest`. Ручной справочник: [plugins/sensors.md](../../plugins/sensors.md).

**Пакет:** `@aurobore/sensors`  
**Разрешения:** нет

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `watchAccelerometer` | `{}` | stream | — |
| `watchGyroscope` | `{}` | stream | — |

## Типы

### `SensorReading`

| Поле | Тип |
|------|-----|
| `x` | `number` |
| `y` | `number` |
| `z` | `number` |
| `timestamp` | `number` |


## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `SENSORS_UNAVAILABLE` | sensors not available | Нет акселерометра/гироскопа на устройстве или плагин в stub-режиме (A3 scaffold) |
## Импорт

```typescript
import { Sensors } from "@aurobore/sensors";
```
