# Camera Demo

Демо плагина **Camera** (A3 scaffold): `getPhoto`, `pickPhoto`, обработка `CAMERA_UNAVAILABLE`.

См. [docs/plugins/camera.md](../../docs/plugins/camera.md).

```bash
# из корня монорепо
pnpm install
cd examples/camera-demo
pnpm build:web
aurobore build
aurobore run
```

## Что демонстрирует

| Кнопка | API |
|---|---|
| Get Photo | `Camera.getPhoto({ quality: 80 })` |
| Pick Photo | `Camera.pickPhoto({})` |

На эмуляторе с A3 stub ожидается `CAMERA_UNAVAILABLE` — это корректное поведение; journal:
`[camera-demo] plugin OK: … round-trip (CAMERA_UNAVAILABLE)`.

При реальной реализации UI — preview через `resolveResourceUrl(photo)`.
