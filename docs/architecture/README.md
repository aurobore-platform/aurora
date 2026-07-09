# Обзор архитектуры

Этот документ — точка входа в архитектуру Aurobore. Он описывает слои системы, потоки данных и
связи между компонентами. Детали каждого компонента вынесены в отдельные документы (ссылки ниже).

## 1. Слои системы

Aurobore состоит из трёх крупных областей:

1. **Среда исполнения (на устройстве):** Runtime + Bridge + Plugin Manager + плагины + WebView.
2. **Инструменты разработчика (на машине разработчика):** CLI, Build System, Dev Server, TypeScript SDK, кодогенерация.
3. **Контракты и метаданные (общие):** манифесты плагинов, конфиг проекта, протокол моста, версии API.

```
РАЗРАБОТКА (хост)                         УСТРОЙСТВО / ЭМУЛЯТОР (Аврора)
┌───────────────────────────┐            ┌───────────────────────────────────┐
│ CLI  ─ create/dev/build…  │            │ Runtime (C++/QML)                 │
│ Dev Server (live/hot)     │  build →   │  ├─ WebView (Chromium/CEF)        │
│ Build System (→ Аврора)   │  ───────▶  │  │   └─ Web App + JS Bridge       │
│ TypeScript SDK + Codegen  │   пакет    │  ├─ Bridge (native)               │
│                           │            │  ├─ Plugin Manager / Loader       │
└───────────────────────────┘            │  └─ Plugins → Qt/Aurora APIs      │
        ▲                                 └───────────────────────────────────┘
        │ единые контракты (манифесты, конфиг, протокол, версии)
        └───────────────────────────────────────────────────────────────────
```

## 2. Компоненты и зоны ответственности

| Компонент | Где работает | За что отвечает | Документ |
|---|---|---|---|
| **Runtime** | устройство | Контейнер: окно, WebView, lifecycle, навигация, splash, ресурсы, разрешения, deep links | [runtime.md](runtime.md) |
| **Bridge** | устройство (JS+native) | Связь JS↔native: вызовы, Promise, события, стримы, ошибки, сериализация | [bridge.md](bridge.md) |
| **Plugin System** | устройство | Модель плагина, манифест, версионирование, разрешения | [plugin-system.md](plugin-system.md) |
| **Plugin Loader** | устройство | Обнаружение/регистрация/экспорт плагинов при старте | [plugin-loader.md](plugin-loader.md) |
| **Event System** | устройство | Системные и пользовательские события, подписки, стримы | [event-system.md](event-system.md) |
| **Configuration** | общее | `aurobore.config`, проекция в артефакты Аврора | [configuration.md](configuration.md) |
| **Build System** | хост | web → нативный проект Аврора (CMake/RPM) → пакет | [build-system.md](build-system.md) |
| **Dev Server** | хост | Локальный сервер, live/hot reload | [dev-server.md](dev-server.md) |
| **CLI** | хост | Оркестрация всех команд разработчика | [cli.md](cli.md) |
| **TypeScript SDK** | хост/устройство | Публичный типизированный API + кодогенерация | [typescript-sdk.md](typescript-sdk.md) |
| **Native SDK** | устройство | Контракты и библиотека для авторов нативных плагинов | [native-sdk.md](native-sdk.md) |

## 3. Главный поток данных: вызов нативной функции

Пример: `const photo = await Aurobore.Camera.getPhoto({ quality: 80 })`.

```
1. JS: вызов через TypeScript SDK (типизированная обёртка плагина Camera)
2. Bridge(JS): формирует сообщение { id, plugin:"Camera", method:"getPhoto", args }
3. Bridge(JS): сохраняет {id → resolve/reject} в таблице ожидания, сериализует, отправляет
4. Transport: доставка на native-сторону (механизм зависит от движка WebView)
5. Bridge(native): десериализует, валидирует версию/разрешения/область
6. Plugin Manager: находит плагин "Camera", вызывает метод getPhoto
7. Plugin(native): выполняет работу (Qt/Aurora API), возможно асинхронно
8. Bridge(native): формирует ответ { id, ok|error, result } и отправляет в JS
9. Bridge(JS): по id находит Promise и резолвит/реджектит его
10. JS: await возвращает результат (или бросает структурированную ошибку)
```

Подробности — в [bridge.md](bridge.md).

## 4. Потоки событий и стримов

- **Событие native → JS** (например `pause`): Runtime/плагин эмитит событие → Bridge(native) →
  transport → Bridge(JS) → доставка подписчикам Event System (`Aurobore.on("pause", …)`).
- **Стрим** (например геолокация): JS оформляет подписку (invoke c флагом «стрим») → native шлёт
  серию сообщений с тем же `subscriptionId` → JS вызывает callback подписки на каждое; отписка
  завершает поток на native-стороне. См. [event-system.md](event-system.md).

## 5. Поток сборки (упрощённо)

```
aurobore build
  → собрать веб (через сборщик пользователя: vite/webpack/…)
  → прочитать aurobore.config + манифесты установленных плагинов
  → сгенерировать нативный проект Аврора (C++/QML, CMake, .spec, .desktop, иконки)
  → внедрить веб-ресурсы и JS-bridge
  → подключить нативные части плагинов и их зависимости
  → вызвать сборку Aurora SDK (CMake → RPM)
  → получить пакет (.rpm)
```

Подробности — в [build-system.md](build-system.md) и [configuration.md](configuration.md).

## 6. Принцип «единого источника истины»

Манифест плагина — **single source of truth**. Из него выводятся:

- native-регистрация (какие методы/события доступны мосту),
- JS-обёртка (`Aurobore.<Plugin>`),
- TypeScript-типы (аргументы, результаты, события),
- декларация разрешений и нативных зависимостей,
- справочная документация по плагину.

Это исключает рассинхронизацию слоёв и ручное дублирование (главный недостаток Cordova).
См. [plugin-system.md](plugin-system.md) и [typescript-sdk.md](typescript-sdk.md).

## 7. Версионирование и совместимость

Независимо версионируются:

- **Протокол моста** (формат сообщений) — `bridgeProtocolVersion`.
- **API Runtime** — что предоставляет контейнер плагинам и JS.
- **API плагина** — semver каждого плагина.
- **Формат конфига** — `configVersion` с правилами миграции.

Runtime при загрузке плагина проверяет совместимость и сообщает понятную ошибку при несовпадении.
Решение зафиксировано в [ADR-002](https://github.com/aurobore-platform/aurora/blob/main/docs/adr/ADR-002-bridge-model.md) и [ADR-003](https://github.com/aurobore-platform/aurora/blob/main/docs/adr/ADR-003-plugin-api.md).

## 8. Ключевые архитектурные решения (ADR)

- [ADR-001](https://github.com/aurobore-platform/aurora/blob/main/docs/adr/ADR-001-runtime-architecture.md) — архитектура Runtime (нативный контейнер на C++/QML).
- [ADR-002](https://github.com/aurobore-platform/aurora/blob/main/docs/adr/ADR-002-bridge-model.md) — модель моста (async message passing, Promise/события/стримы).
- [ADR-003](https://github.com/aurobore-platform/aurora/blob/main/docs/adr/ADR-003-plugin-api.md) — Plugin API на основе манифеста + кодогенерация.
- [ADR-004](https://github.com/aurobore-platform/aurora/blob/main/docs/adr/ADR-004-webview-engine-abstraction.md) — целевой движок Chromium/CEF; тонкий шов транспорта.
- [ADR-005](https://github.com/aurobore-platform/aurora/blob/main/docs/adr/ADR-005-cli-stack.md) — стек CLI/инструментов (Node/TypeScript).
- [ADR-006](https://github.com/aurobore-platform/aurora/blob/main/docs/adr/ADR-006-configuration-format.md) — формат конфигурации.
- [ADR-007](https://github.com/aurobore-platform/aurora/blob/main/docs/adr/ADR-007-packaging-build.md) — упаковка и сборка (CMake/RPM).
- [ADR-008](https://github.com/aurobore-platform/aurora/blob/main/docs/adr/ADR-008-typescript-sdk-codegen.md) — кодогенерация SDK.
- [ADR-010](https://github.com/aurobore-platform/aurora/blob/main/docs/adr/ADR-010-w3c-polyfills.md) — опциональные W3C API polyfills.
- [ADR-011](https://github.com/aurobore-platform/aurora/blob/main/docs/adr/ADR-011-camera-frame-channel.md) — getUserMedia fallback через Camera.
- [ADR-012](https://github.com/aurobore-platform/aurora/blob/main/docs/adr/ADR-012-ota-live-updates.md) — OTA live-updates веб-бандла.
