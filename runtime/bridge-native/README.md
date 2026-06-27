# bridge-native (M2/M3)

Native-сторона моста: валидация протокола, `trustedOrigin`, делегирование в **PluginManager**.

## BridgeRouter

| API | Назначение |
|-----|------------|
| `handleMessage(QVariant)` | JS→native: parse, validate, dispatch через PluginManager |
| `initializePlugins()` | Загрузка плагинов из сгенерированного `PluginRegistry` |
| `setGrantedPermissions(QStringList)` | Разрешения приложения для проверки invoke |
| `emitEvent(name, data)` | native→JS lifecycle / plugin events |
| `emitStream(id, phase, payload?, error?)` | native→JS stream chunks |
| `outbound` signal | QML → `runJavaScript(__auroboreBridgeReceive(...))` |

Плагины описываются в `plugins/*/plugin.manifest` и регистрируются кодогеном (`pnpm codegen:plugins`).
Реализации — `plugins/*/native/`, контракт — `runtime/native-sdk/IPlugin.h`.

Канал WebView: `aurobore:bridge` (см. `@aurobore/core` `BRIDGE_CHANNEL`).
