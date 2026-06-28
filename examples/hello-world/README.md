# Hello World

Полноценный пример Aurobore: Echo-мост (invoke, ошибки, стрим), lifecycle-события, плагин Device.

См. [docs/tutorials/quick-start.md](../../docs/tutorials/quick-start.md) и [docs/tutorials/using-plugins.md](../../docs/tutorials/using-plugins.md).

```bash
# из корня монорепо
pnpm install
cd examples/hello-world
pnpm build:web
aurobore build
aurobore run
```

## Что демонстрирует

| Кнопка / раздел | API |
|---|---|
| ping / echo | `import { Echo } from "@aurobore/echo"` |
| fail | обработка `AuroboreError` / `wrapBridgeError` |
| watchTicks | стрим с `stop()` |
| getInfo | `import { Device } from "@aurobore/device"` |
| Lifecycle | `on("pause")`, `once("ready")` из `@aurobore/core` |
