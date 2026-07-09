# Справочник по ОС Аврора (выжимка официальной документации)

> Этот раздел — **кураторская выжимка** из официальной документации ОС Аврора
> ([developer.auroraos.ru](https://developer.auroraos.ru/doc)), собранная под нужды разработки
> платформы **Aurobore**. Это не замена официальной документации, а навигационный слой:
> ключевые факты + ссылки на первоисточник + проекция на наши компоненты.

## Зачем этот раздел

Aurobore генерирует нативный проект Аврора и опирается на штатный инструментарий (Аврора SDK, mb2,
RPM, WebView, песочница). Чтобы Runtime/Build/CLI принимали решения на фактах, а не на догадках,
здесь зафиксированы релевантные сведения об ОС Аврора с указанием источника.

> ⚠️ **Версионность.** На момент сбора официальная документация описывает **ОС Аврора 5.2.1**
> и **Аврора SDK 5.2.x**. API и имена пакетов эволюционируют — факты подлежат периодической
> верификации (skill `verify-aurora-deps`, роль Research Agent в [agents/README.md](../agents/README.md)).

## Состав раздела

| Документ | О чём | Первоисточник |
|---|---|---|
| [sdk-overview.md](sdk-overview.md) | Аврора SDK vs Platform SDK, варианты поставки (mb2 / Build Tools), эмулятор, IDE, архитектуры | `/doc/sdk`, `/doc/sdk/app_development` |
| [app-development.md](app-development.md) | Рабочий цикл: создать → собрать → запустить; среда сборки; отладка/профилирование | `/doc/sdk/app_development/work` |
| [build-and-packaging.md](build-and-packaging.md) | `mb2`/`sb2`/`apptool`, сборка RPM, подпись, доставка на устройство, `.spec`/`.desktop`, CMake/qmake | `/doc/sdk/psdk/build`, `/doc/software_development/guidelines` |
| [tooling.md](tooling.md) | Инструменты SDK (сборка/отладка/пакеты/анализ/тесты), контакты ОМП | `/doc/sdk/tools` |
| [webview.md](webview.md) | Адаптация веб-приложения через фреймворк WebView; пути доставки (Aurobore, WebApp Generator, PWA, Flutter) — §8 | `/doc/software_development` |
| [sandbox-and-permissions.md](sandbox-and-permissions.md) | Песочница (Firejail), разрешения в `.desktop`, общие директории, D-Bus | `/doc/sdk/app_development/work/sandbox` |
| [requirements-and-conventions.md](requirements-and-conventions.md) | Требования к ПО, профили безопасности, чек-лист готовности, оформление кода C++/QML | `/doc/software_development/guidelines` |
| [ui-kit.md](ui-kit.md) | UI Kit Авроры: scope для нативного chrome Aurobore (cover, splash, icons, desktop) | `/doc/ui_kit` |
| [glossary.md](glossary.md) | Термины ОС Аврора (МУ, таргет, sysroot, кросс-компиляция, песочница, Build Engine) | сводно |
| [verification-status.md](verification-status.md) | Реестр допущений: что подтверждено официально, что открыто и как проверить | — |
| [compatibility-matrix.md](compatibility-matrix.md) | Матрица совместимости: minOs, SDK targets, прогон сценариев A6 | — |
| [sources.md](sources.md) | Реестр использованных страниц документации | — |

## Как это связано с архитектурой Aurobore

| Тема Аврора | Документ Aurobore |
|---|---|
| WebView (движок, интеграция) | [architecture/runtime.md](../architecture/runtime.md), [adr/ADR-001](../adr/ADR-001-runtime-architecture.md), [adr/ADR-004](../adr/ADR-004-webview-engine-abstraction.md) |
| Сборка/упаковка (RPM, `.spec`, mb2) | [architecture/build-system.md](../architecture/build-system.md), [adr/ADR-007](../adr/ADR-007-packaging-build.md) |
| Разрешения, `.desktop`, песочница | [architecture/configuration.md](../architecture/configuration.md), [architecture/runtime.md](../architecture/runtime.md) |
| Нативные зависимости, именование `ru.auroraos.*` | [adr/ADR-009](../adr/ADR-009-naming.md), [architecture/plugin-system.md](../architecture/plugin-system.md) |
| Среда сборки/таргеты в CLI | [architecture/cli.md](../architecture/cli.md) |

## Правила работы с этим разделом

1. **Каждый факт — со ссылкой на источник.** Если факт получен из официальной страницы — указываем URL.
2. **Сомнительное — помечаем `(verify)`.** Точные имена RPM-пакетов/pkgconfig, флаги CMake и версии
   проверяются против реально установленного SDK перед использованием в коде/шаблонах.
3. **Не дублируем архитектуру Aurobore.** Здесь — только факты об ОС Аврора; решения и реализация — в `architecture/`, `adr/`.
