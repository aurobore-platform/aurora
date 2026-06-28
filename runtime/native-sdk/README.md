# native-sdk (M3) — контракт реализации

Кодовая база нативной инфраструктуры плагинов. Архитектурное описание (концепции, без привязки к файлам) —
[docs/architecture/native-sdk.md](../../docs/architecture/native-sdk.md).

Операционный гайд — [docs/dev/native-plugin-guide.md](../../docs/dev/native-plugin-guide.md).

## Компоненты

| Файл | Роль |
|---|---|
| `IPlugin.h` / `IPlugin.cpp` | Базовый контракт плагина и helpers ошибок |
| `PluginDescriptor.h` | Метаданные из манифеста (methods, permissions, bridgeProtocol) |
| `PluginManager.h` / `PluginManager.cpp` | Маршрутизация invoke/cancel, permissions, method whitelist |
| `PluginRegistry.{h,cpp}` | **Кодоген** в `runtime/container/generated/` — реестр и фабрики |

## Контракт `IPlugin`

```cpp
class IPlugin : public QObject {
public:
    virtual QString displayName() const = 0;

    // Успех: QVariant (Map, List, примитив) или пустой QVariant для stream-start
    // Ошибка: QVariantMap с полями code, message, [data]
    virtual QVariant invoke(const QString &method, const QVariant &args,
                            const QString &id, bool isStream) = 0;

    virtual void cancel(const QString &id);

protected:
    BridgeRouter *router() const;  // emitStream, emitEvent
    QVariant makeMethodNotFound(const QString &method) const;
    QVariant makeError(const QString &code, const QString &message,
                       const QVariant &data = QVariant()) const;
};
```

### Возврат из `invoke`

| Случай | Возврат |
|---|---|
| Успех (обычный вызов) | `QVariant` с результатом (например `QVariantMap`) |
| Стрим (`isStream == true`) | Запустить источник, вернуть пустой `QVariant`; данные через `router()->emitStream(id, "data", payload)`; завершение — `"complete"` |
| Ошибка плагина | `makeError("FOO_ERROR", "message", optionalData)` → PluginManager превратит в ответ моста |
| Неизвестный method | `makeMethodNotFound(method)` → `BRIDGE_METHOD_NOT_FOUND` |

Пример ошибки в плагине:

```cpp
return makeError(QStringLiteral("STORAGE_INVALID_ARGS"),
                 QStringLiteral("key required"));
```

## `PluginManager`

Вызывается из `BridgeRouter::handleMessage` для `type: "invoke"` и `type: "cancel"`.

Проверки перед dispatch:

1. Плагин зарегистрирован → иначе `BRIDGE_PLUGIN_NOT_FOUND`
2. Method в whitelist дескриптора → иначе `BRIDGE_METHOD_NOT_FOUND`
3. Все `permissions` из манифеста есть в granted-списке → иначе `BRIDGE_PERMISSION_DENIED`

Загрузка при старте: `BridgeRouter::initializePlugins()` → `PluginRegistry::descriptors()` +
`PluginRegistry::createPlugin()`.

## Фабрика плагина

Каждый плагин экспортирует C-linkage factory в своём `.cpp`:

```cpp
IPlugin *createDevicePlugin(BridgeRouter *router);
```

Объявление — в сгенерированном `PluginRegistry.h`. Реализация registry вызывает фабрики, не `new XxxPlugin` напрямую.

## События и стримы

Из плагина:

```cpp
router()->emitEvent(QStringLiteral("network:change"), statusMap);
router()->emitStream(subscriptionId, QStringLiteral("data"), payload);
router()->emitStream(subscriptionId, QStringLiteral("complete"));
```

События доставляются в JS через `BridgeRouter::outbound` → `__auroboreBridgeReceive`.

## Кодоген

После изменения `plugin.manifest`:

```powershell
pnpm codegen:plugins
```

Не редактировать `runtime/container/generated/PluginRegistry.*` вручную.

## См. также

- [plugins/](../../plugins/) — реализации MVP-плагинов
- [docs/dev/adding-a-plugin.md](../../docs/dev/adding-a-plugin.md) — чеклист нового плагина
- [runtime/bridge-native/README.md](../bridge-native/README.md) — BridgeRouter
