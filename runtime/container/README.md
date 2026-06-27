# M1/M2: Aurobore runtime-контейнер

Нативный контейнер (C++/QML) для платформы Aurobore. Прогон: **SDK 5.2.1.200**.

## Возможности M1

| FR | Реализация |
|---|---|
| FR-R1 | `ApplicationWindow` + fullscreen `WebView` |
| FR-R2/R6 | Loopback `AssetSchemeServer` (`http://127.0.0.1:<port>/`) — единый origin для SPA; конфиг `aurobore-app://` как логический ключ |
| FR-R3 | Demo SPA (History API) + `aurobore:back` / `__auroboreSpaBack` |
| FR-R4 | `SplashScreen.qml` + `aurobore:ready` + таймаут |
| FR-R5 | `aurobore-bridge.js` + `LifecycleBridge` → `BridgeRouter.emitEvent` |
| FR-R7 | `InitBrowser()` + `ru.auroraos.WebView` |

## M2 Bridge (FR-B1…B6)

| FR | Реализация |
|---|---|
| FR-B1…B4 | `@aurobore/bridge-js` invoke→Promise; `runtime/bridge-native/BridgeRouter` + Echo stub |
| FR-B5 | События через `{type:"event"}`; lifecycle + `app:demo` ↔ `app:echo` |
| FR-B6 | `Echo.watchTicks` stream (5 ticks @ 200ms) |

Канал: `aurobore:bridge`. Сборка JS-бандла: `pnpm --filter @aurobore/bridge-js build`.

## Сборка и запуск

```powershell
pnpm container:all
```

Отдельные шаги: `container:sync|build|deploy|run`. См. [tools/aurora/README.md](../../tools/aurora/README.md).

Staging по умолчанию: `%USERPROFILE%\aurobore-spike\aurobore-container`.

## Успех прогона

В journal эмулятора (M2):

```
[aurobore-container] M2 OK: bridge invoke, events, stream verified
```

Также сохраняется M1 marker:

```
[aurobore-container] M1 OK: aurobore-app loaded, lifecycle ready, SPA back works
```

## Структура

| Путь | Назначение |
|---|---|
| `src/main.cpp` | Bootstrap: `InitBrowser`, контекст QML |
| `src/AssetResolver.*` | Маппинг `aurobore-app://` → файлы в `html/` |
| `src/AssetSchemeServer.*` | Loopback HTTP (аналог Capacitor `https://localhost`); см. § Asset loader |
| `src/LifecycleBridge.*` | pause/resume из `applicationStateChanged` |
| `qml/pages/WebAppPage.qml` | WebView, splash, URL filtering |
| `html/` | Self-test SPA |

## Источники паттернов

- [WebViewAPI](https://hub.mos.ru/auroraos/demos/WebViewAPI) — `LoadRequestExtension`, async messages
- [WebViewBrowser](https://hub.mos.ru/auroraos/demos/WebViewBrowser) — `ApplicationWindow` / cover / pages
- [`runtime/poc-bridge/`](../poc-bridge/) — `InitBrowser`, упаковка (M0)

## Asset loader (CEF scheme handler vs loopback)

**Исследование (SDK 5.2.1.200):** публичный `aurorawebview-devel` **не** экспортирует заголовки `libcef`
(`CefRegisterSchemeHandlerFactory`). QML `LoadRequestExtension.beforeUrlLoad` — только allow/deny;
редirect на `file://` ломает subresources и History API. Флаг `nativeSchemeHandling` не заменяет
scheme handler с отдачей тела ответа.

**Текущая реализация:** `AssetSchemeServer` — минимальный HTTP на `127.0.0.1:<port>`, маппинг путей через
`AssetResolver` (логически `aurobore-app://localhost/<path>`). WebView грузит `http://127.0.0.1:…/index.html`;
CSS/JS — относительные URL; path-based History API работает без hash-workaround.

**Дальше (post-M1):** spike прямой регистрации scheme в libcef (если OMP откроет API) или HTTPS loopback
с локальным сертификатом для secure context.
