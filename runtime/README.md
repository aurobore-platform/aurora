# runtime/ — нативная часть (C++/QML)

Исполняется на устройстве ОС Аврора. См. [docs/repository-structure.md](../docs/repository-structure.md) §3
и [docs/architecture/runtime.md](../docs/architecture/runtime.md).

| Каталог               | Назначение                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `container/`          | ✅ M1: шаблон нативного контейнера (ApplicationWindow, WebView, lifecycle, splash, asset loader `aurobore-app://`). |
| `bridge-native/`      | Native-сторона моста (валидация, маршрутизация, ошибки) — M2.                                 |
| `transport/cef/`      | Целевая реализация транспорта на CEF (`CefMessageRouter`/`cefQuery`) — M2.                    |
| `transport/loopback/` | In-memory двойник транспорта для тестов — M2.                                                 |
| `native-sdk/`         | Контракты/библиотека для авторов плагинов — M3.                                               |
| `poc-bridge/`         | M0 Spike: PoC эхо-моста на реальном Aurora SDK (валидация V-1/V-2/V-3/V-6).                   |
