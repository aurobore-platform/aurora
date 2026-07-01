# Geo Demo

Демо плагина **Geolocation** (A3 scaffold): `getCurrentPosition`, `watch`, обработка `GEOLOCATION_UNAVAILABLE`.

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
| Get Position | `Geolocation.getCurrentPosition({ enableHighAccuracy: true })` |
| Start Watch | `Geolocation.watch({ enableHighAccuracy: true })` |
| Stop Watch | `sub.stop()` |

На эмуляторе с A3 stub ожидается `GEOLOCATION_UNAVAILABLE` — journal:
`[geo-demo] plugin OK: … round-trip (GEOLOCATION_UNAVAILABLE)`.
