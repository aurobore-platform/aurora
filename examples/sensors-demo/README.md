# Sensors Demo

Демо плагина **Sensors** (P3): `watchAccelerometer`, `watchGyroscope`, обработка ошибок IMU.

См. [docs/plugins/sensors.md](../../docs/plugins/sensors.md).

```bash
# из корня монорепо
pnpm install
cd examples/sensors-demo
pnpm build:web
aurobore build
aurobore run
```

## Что демонстрирует

| Кнопка | API |
|---|---|
| Start Accel | `Sensors.watchAccelerometer()` |
| Stop Accel | `sub.stop()` |
| Start Gyro | `Sensors.watchGyroscope()` |
| Stop Gyro | `sub.stop()` |

На **устройстве с IMU** — readings в UI и journal (`[sensors-demo] plugin OK: watchAccelerometer stream started`).

На **эмуляторе без IMU** — `SENSORS_UNAVAILABLE` (ожидаемо), journal:
`[sensors-demo] plugin OK: … round-trip (SENSORS_UNAVAILABLE)`.
