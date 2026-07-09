# Источники (реестр страниц документации ОС Аврора)

> Реестр официальных страниц [developer.auroraos.ru](https://developer.auroraos.ru/doc), использованных
> при подготовке раздела `docs/aurora/`. Версия документации на момент сбора — **ОС Аврора 5.1.x–5.2.x**.
> Факты подлежат периодической перепроверке (skill `verify-aurora-deps`).
> Текущий статус проверки допущений — в [verification-status.md](verification-status.md).

## Официальные страницы

| Раздел | URL | Где использовано |
|---|---|---|
| Аврора SDK (обзор) | https://developer.auroraos.ru/doc/sdk | [sdk-overview.md](sdk-overview.md) |
| Прикладная разработка | https://developer.auroraos.ru/doc/sdk/app_development | [sdk-overview.md](sdk-overview.md) |
| Работа с проектом | https://developer.auroraos.ru/doc/sdk/app_development/work | [app-development.md](app-development.md) |
| Сборка проекта (app) | https://developer.auroraos.ru/doc/sdk/app_development/work/build | [build-and-packaging.md](build-and-packaging.md) |
| Установка SDK для Windows | https://developer.auroraos.ru/doc/sdk/app_development/setup/setup_windows | [app-development.md](app-development.md) |
| Песочница | https://developer.auroraos.ru/doc/sdk/app_development/work/sandbox | [sandbox-and-permissions.md](sandbox-and-permissions.md) |
| Сборка проекта (Platform SDK) | https://developer.auroraos.ru/doc/sdk/psdk/build | [build-and-packaging.md](build-and-packaging.md) |
| Инструменты SDK | https://developer.auroraos.ru/doc/sdk/tools | [tooling.md](tooling.md), [glossary.md](glossary.md) |
| Разработка ПО (обзор) | https://developer.auroraos.ru/doc/software_development | [webview.md](webview.md) |
| Рекомендации и требования | https://developer.auroraos.ru/doc/software_development/guidelines/webview | [requirements-and-conventions.md](requirements-and-conventions.md) |
| Справочная документация (таблица версий API) | https://developer.auroraos.ru/doc/5.1.6/software_development/reference/webview_chromium | [webview.md](webview.md) |
| Веб и контент (Webview Chromium/Gecko) | https://developer.auroraos.ru/doc/5.1.6/software_development/reference/web_and_content | [webview.md](webview.md) |
| Фреймворк WebView (Chromium) — API | https://developer.auroraos.ru/doc/5.1.3/software_development/reference/webview_chromium | [webview.md](webview.md) |
| UI Kit (проектирование и дизайн) | https://developer.auroraos.ru/doc/ui_kit | [ui-kit.md](ui-kit.md) |
| Требования к .desktop | https://developer.auroraos.ru/doc/5.1.3/software_development/guidelines/rpm_requirements/desktop_requirements | [ui-kit.md](ui-kit.md), [build-and-packaging.md](build-and-packaging.md) |

## Перепроверка по сообществу/примерам (не первоисточник)

> Используется только как **кросс-проверка** официальных фактов; не заменяет SDK.

| Что | Источник | Где использовано |
|---|---|---|
| WebApp Generator — официальный OMP-генератор WebView-обёрток (JSON → `.desktop`/`.spec`/QML/cover, удалённый `url`) | https://hub.mos.ru/auroraos/tools/WebAppGenerator | [webview.md](webview.md) §8, [glossary.md](glossary.md) |
| Flutter-плагины и пакеты, адаптированные под Аврору (референс platform-кода при реализации Aurobore-плагинов) | https://hub.mos.ru/auroraos/flutter/flutter-community-plugins | [alpha-plugins-plan.md](../alpha-plugins-plan.md), [native-plugin-guide.md](../dev/native-plugin-guide.md) |
| Демо «WebView Browser» (CEF engine, зависимости `ru.aurora.webview`/`libcef`) | https://hub.mos.ru/auroraos/demos/WebViewBrowser | [webview.md](webview.md), [verification-status.md](verification-status.md) |
| Демо «WebView API» (async messages, runJavaScript, SSL, download — с 5.1.3) | https://hub.mos.ru/auroraos/demos/WebViewAPI | [webview.md](webview.md), [verification-status.md](verification-status.md) |
| Практика сборки WebView (CMake `find_library(aurorawebview)`, `.spec`, RPATH, `ru.auroraos.webview(-devel)`) | https://gelassen.github.io/blog/2025/08/23/developing-application-for-aurora-os-system-programming.html | [webview.md](webview.md), [verification-status.md](verification-status.md) |
| `CefMessageRouter` / `window.cefQuery` (апстрим CEF) | https://github.com/chromiumembedded/cef/blob/master/include/wrapper/cef_message_router.h | [webview.md](webview.md) |

## Регламент обновления

1. При изменении версии ОС/SDK — перепроверить страницы выше и обновить пометку версии в файлах раздела.
2. Любой пункт `(verify)`, подтверждённый против реального SDK, переносить в основной текст со ссылкой
   и обновлять статус в [verification-status.md](verification-status.md).
3. Изменения, влияющие на архитектуру/контракты, отражать в соответствующих `architecture/`/`adr/`.
