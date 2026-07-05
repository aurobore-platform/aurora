# M1/M2/M3: Aurobore runtime-контейнер

Нативный контейнер (C++/QML) для платформы Aurobore. Прогон: **SDK 5.2.1.200**.

Операционный гайд по плагинам и staging: [docs/dev/native-plugin-guide.md](../../docs/dev/native-plugin-guide.md).

## Возможности M1

| FR | Реализация |
|---|---|
| FR-R1 | `ApplicationWindow` + fullscreen `WebView` |
| FR-R2/R6 | Loopback `AssetSchemeServer` (`https://127.0.0.1:<port>/`) — единый origin для SPA; конфиг `aurobore-app://` как логический ключ |
| FR-R3 | Demo SPA (History API) + `aurobore:back` / `__auroboreSpaBack` |
| FR-R4 | `SplashScreen.qml` + `aurobore:ready` + таймаут |
| FR-R5 | `aurobore-bridge.js` + `LifecycleBridge` → `BridgeRouter.emitEvent` |
| FR-R7 | `InitBrowser()` + `ru.auroraos.WebView` |

## M2 Bridge (FR-B1…B6)

| FR | Реализация |
|---|---|
| FR-B1…B4 | `@aurobore/bridge-js` invoke→Promise; `runtime/bridge-native/BridgeRouter` |
| FR-B5 | События через `{type:"event"}`; lifecycle + `app:demo` ↔ `app:echo` |
| FR-B6 | `Echo.watchTicks` stream (5 ticks @ 200ms) |

Канал: `aurobore:bridge`. Сборка JS-бандла: `pnpm --filter @aurobore/bridge-js build`.

## M3 Plugins (FR-P1…P5)

| FR | Реализация |
|---|---|
| FR-P1 | `plugin.manifest` + валидация в `@aurobore/build` |
| FR-P2/P4 | `PluginManager` + кодоген `PluginRegistry` |
| FR-P3 | `aurobore-plugins.js` → `Aurobore.<Plugin>.<method>()`, `Aurobore.__plugins` |
| FR-P5 | MVP: Device, Storage, FileSystem, Clipboard, Network + Echo |

Кодоген: `pnpm codegen:plugins`. Плагины: `plugins/*/`, native SDK: `runtime/native-sdk/`.

## Сборка и запуск

```powershell
pnpm container:all
```

Отдельные шаги: `container:sync|build|deploy|run`. См. [tools/aurora/README.md](../../tools/aurora/README.md).

**Web DevTools:** в dev-режиме (`aurobore dev`) или с `AUROBORE_CEF_DEBUG_PORT` — см. [docs/dev/web-debugging.md](../../docs/dev/web-debugging.md).

Staging по умолчанию: `%USERPROFILE%\aurobore-spike\aurobore-container` (+ siblings `bridge-native`, `native-sdk`, `plugins`).

## Успех прогона

В journal эмулятора:

```
[aurobore-container] M1 OK: aurobore-app loaded, lifecycle ready, SPA back works
[aurobore-container] M2 OK: bridge invoke, events, stream verified
[aurobore-container] M3 OK: plugins registered, Device + Storage verified
```

Также при старте: `[aurobore-plugin] registered <Name> v…`.

## Структура

| Путь | Назначение |
|---|---|
| `src/main.cpp` | Bootstrap: `InitBrowser`, PluginManager init, контекст QML |
| `src/AssetResolver.*` | Маппинг `aurobore-app://` → файлы в `html/` |
| `src/AssetSchemeServer.*` | Loopback HTTPS (аналог Capacitor `https://localhost`); см. § Asset loader |
| `src/LoopbackTlsCredentials.*` | Встроенный TLS cert/key + SPKI fingerprint для `InitBrowser` |
| `tls/` | PEM-сертификат loopback (генерируется `tools/aurora/gen-loopback-tls.mjs`) |
| `src/LifecycleBridge.*` | pause/resume из `applicationStateChanged` |
| `generated/PluginRegistry.*` | Кодоген: реестр плагинов (не редактировать) |
| `../bridge-native/` | BridgeRouter (staging sibling) |
| `../native-sdk/` | IPlugin, PluginManager |
| `../plugins/` | Нативные реализации плагинов |
| `qml/pages/WebAppPage.qml` | WebView, splash, URL filtering, `trustedOrigin` |
| `qml/verification/` | Harness W3–W6 (WebView verification); **только dev-toolkit** (`pnpm container:*`); в user RPM через `aurobore build` **не копируется** |
| `html/` | Demo SPA + `aurobore-bridge.js` + `aurobore-plugins.js` |

## Источники паттернов

- [WebViewAPI](https://hub.mos.ru/auroraos/demos/WebViewAPI) — `LoadRequestExtension`, async messages
- [WebViewBrowser](https://hub.mos.ru/auroraos/demos/WebViewBrowser) — `ApplicationWindow` / cover / pages
- [`runtime/poc-bridge/`](../poc-bridge/) — `InitBrowser`, упаковка (M0)

## Asset loader (CEF scheme handler vs loopback)

**Исследование (SDK 5.2.1.200):** публичный `aurorawebview-devel` **не** экспортирует заголовки `libcef`
(`CefRegisterSchemeHandlerFactory`). QML `LoadRequestExtension.beforeUrlLoad` — только allow/deny;
редirect на `file://` ломает subresources и History API. Флаг `nativeSchemeHandling` не заменяет
scheme handler с отдачей тела ответа.

**Текущая реализация:** `AssetSchemeServer` — минимальный HTTPS на `127.0.0.1:<port>`, маппинг путей через
`AssetResolver` (логически `aurobore-app://localhost/<path>`). WebView грузит `https://127.0.0.1:…/index.html`;
самоподписанный сертификат доверяется автоматически через `InitBrowser(ignore-certificate-errors=<SPKI>)` —
без действий пользователя. CSS/JS — относительные URL; path-based History API работает без hash-workaround.
При недоступности Qt SSL — fallback на HTTP.

**Дальше (post-M1):** spike прямой регистрации scheme в libcef (если OMP откроет API).
