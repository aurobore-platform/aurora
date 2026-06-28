# Добавление нового плагина (чеклист)

Пошаговый рецепт для core-плагина в монорепо. Пример: гипотетический плагин **Foo** (`display: "Foo"`).

Архитектурный контракт — [plugin-api.md](../plugins/plugin-api.md). Workflow — [native-plugin-guide.md](native-plugin-guide.md).

## 1. Манифест

Создайте `plugins/foo/plugin.manifest` по образцу `plugins/device/plugin.manifest`:

```json
{
  "manifestVersion": 1,
  "name": "foo",
  "display": "Foo",
  "version": "1.0.0",
  "engineCompat": { "runtime": ">=0.1.0", "bridgeProtocol": 1 },
  "permissions": [],
  "methods": {
    "bar": { "args": {}, "result": "void" }
  },
  "errors": {
    "FOO_BAR_FAILED": {
      "message": "bar operation failed",
      "description": "Когда и почему возникает — для документации и аудита"
    }
  }
}
```

Каждый код в `errors` должен совпадать с `QStringLiteral("FOO_...")` в native `.cpp` (проверяется тестом `errors-audit.test.ts`).

Проверка без эмулятора: `pnpm test` (пакет `@aurobore/build`, тесты manifest/codegen).

## 2. Нативная реализация

```
plugins/foo/native/
├── FooPlugin.h
└── FooPlugin.cpp
```

- Класс наследует `IPlugin` из `runtime/native-sdk/IPlugin.h`
- Реализуйте `displayName()`, `invoke()`, при необходимости `cancel()`
- В конце `FooPlugin.cpp` — фабрика:

```cpp
#include "PluginRegistry.h"

IPlugin *createFooPlugin(BridgeRouter *router) {
    return new FooPlugin(router);
}
```

См. эталон: `plugins/echo/native/EchoPlugin.{h,cpp}`.

## 3. Регистрация в кодогене

Добавьте `"foo"` в массив `PLUGIN_NAMES` в
[packages/build/scripts/codegen-plugins.mjs](../../packages/build/scripts/codegen-plugins.mjs).

```powershell
pnpm codegen:plugins
```

Убедитесь, что появились `plugins/foo/generated/` и обновился
`runtime/container/generated/PluginRegistry.*`.

## 4. CMake

В [runtime/container/CMakeLists.txt](../../runtime/container/CMakeLists.txt):

1. Добавьте `${PLUGIN_NATIVE_DIR}/foo/native/FooPlugin.cpp` в `add_executable`
2. Добавьте `${PLUGIN_NATIVE_DIR}/foo/native` в `target_include_directories`

## 5. Сборка и проверка

```powershell
pnpm container:build
pnpm container:deploy
pnpm container:run
```

Или одной командой: `pnpm container:all`.

В journal ожидайте:

```
[aurobore-plugin] registered Foo v1.0.0 (N methods)
```

В WebView: `Aurobore.Foo.bar()` (после загрузки `aurobore-plugins.js`).

## 6. Permissions (если нужны)

1. Добавьте permission в `plugin.manifest` (`"permissions": ["Internet"]` и т.д.)
2. Убедитесь, что permission есть в granted-списке в `runtime/container/src/main.cpp`
3. Для публикации в RPM — вручную обновите `.desktop` контейнера (автоматизация — **M4**)

## Чеклист перед PR

- [ ] `plugin.manifest` валиден (`pnpm test`)
- [ ] `pnpm codegen:plugins` выполнен, `generated/` в коммите или воспроизводим из manifest
- [ ] Factory `createFooPlugin` в `.cpp`, не `new FooPlugin` в registry
- [ ] CMake обновлён
- [ ] `pnpm container:all` или journal M3 OK на эмуляторе
