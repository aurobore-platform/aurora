# Camera Demo

Демо плагина **Camera** (P1): `getPhoto`, `pickPhoto`, preview через `resolveResourceUrl`.

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

На эмуляторе без камеры `getPhoto` → `CAMERA_UNAVAILABLE`; `pickPhoto` может открыть галерею.
На физическом устройстве обе кнопки должны показывать preview в `<img>`.
