# M1: Aurobore runtime-контейнер

Минимальный нативный контейнер (C++/QML) для платформы Aurobore. Прогон: **SDK 5.2.1.200**.

## Возможности M1

| FR | Реализация |
|---|---|
| FR-R1 | `ApplicationWindow` + fullscreen `WebView` |
| FR-R2/R6 | Локальное веб-приложение через `aurobore-app://` + `LoadRequestExtension` |
| FR-R3 | Demo SPA (History API) + `aurobore:back` / `__auroboreSpaBack` |
| FR-R4 | `SplashScreen.qml` + `aurobore:ready` + таймаут |
| FR-R5 | `aurobore-bootstrap.js` + `LifecycleBridge` (pause/resume/ready) |
| FR-R7 | `InitBrowser()` + `ru.auroraos.WebView` |

## Сборка и запуск

```powershell
pnpm container:all
```

Отдельные шаги: `container:sync|build|deploy|run`. См. [tools/aurora/README.md](../../tools/aurora/README.md).

Staging по умолчанию: `%USERPROFILE%\aurobore-spike\aurobore-container`.

## Успех прогона

В journal эмулятора:

```
[aurobore-container] M1 OK: aurobore-app loaded, lifecycle ready, SPA back works
```

## Структура

| Путь | Назначение |
|---|---|
| `src/main.cpp` | Bootstrap: `InitBrowser`, контекст QML |
| `src/AssetResolver.*` | Маппинг `aurobore-app://` → файлы в `html/` |
| `src/LifecycleBridge.*` | pause/resume из `applicationStateChanged` |
| `qml/pages/WebAppPage.qml` | WebView, splash, URL filtering |
| `html/` | Self-test SPA |

## Источники паттернов

- [WebViewAPI](https://hub.mos.ru/auroraos/demos/WebViewAPI) — `LoadRequestExtension`, async messages
- [WebViewBrowser](https://hub.mos.ru/auroraos/demos/WebViewBrowser) — `ApplicationWindow` / cover / pages
- [`runtime/poc-bridge/`](../poc-bridge/) — `InitBrowser`, упаковка (M0)
