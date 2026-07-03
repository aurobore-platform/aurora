# Geo Demo

Демо плагина **Geolocation** (P2): `getCurrentPosition`, `watch`, `clearWatch`, обработка ошибок GPS.

См. [docs/plugins/geolocation.md](../../docs/plugins/geolocation.md).

```bash
# из корня монорепо
pnpm install
cd examples/geo-demo
pnpm build:web
aurobore build
aurobore run
```

## Что демонстрирует

| Кнопка | API |
|---|---|
| Get Position | `Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 30000 })` |
| Start Watch | `Geolocation.watch({ enableHighAccuracy: true })` |
| Stop Watch | `sub.stop()` |
| Clear Watch | `Geolocation.clearWatch({ watchId: sub.subscriptionId })` |

На **устройстве с GPS** — реальные координаты в UI и journal (`[geo-demo] plugin OK: getCurrentPosition success`).

На **эмуляторе без mock GPS** — `GEOLOCATION_UNAVAILABLE` (ожидаемо), journal:
`[geo-demo] plugin OK: … round-trip (GEOLOCATION_UNAVAILABLE)`.
