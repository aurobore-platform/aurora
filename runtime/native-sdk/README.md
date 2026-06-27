# native-sdk (M3)

Контракты и инфраструктура для нативных плагинов:

- `IPlugin.h` — базовый интерфейс плагина (`invoke`, `cancel`, `displayName`)
- `PluginDescriptor.h` — метаданные из манифеста (методы, permissions, …)
- `PluginManager` — маршрутизация invoke/cancel, проверка permissions и method whitelist
- `PluginRegistry` (кодоген в `runtime/container/generated/`) — фабрика плагинов на сборке
