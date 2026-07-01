# Структура репозитория

> Соответствует пункту 4 задачи: каталоги, их назначение, разделение на пакеты, документация,
> примеры, тесты. Это проект структуры; код пока не создаётся.

## 1. Подход: монорепо

Aurobore — монорепозиторий (несколько пакетов в одном репо), потому что компоненты тесно связаны
общими контрактами (протокол моста, формат манифеста/конфига), версионируются согласованно и должны
тестироваться вместе. Управление — через workspaces (pnpm/npm) для JS-пакетов и подкаталоги для
нативной части и шаблонов.

## 2. Дерево верхнего уровня

```
aurobore/
├── README.md                  # обзор проекта, быстрый старт, ссылки
├── LICENSE                    # open-source лицензия
├── CONTRIBUTING.md            # как вносить вклад (процесс RFC/ADR, стиль)
├── CODE_OF_CONDUCT.md
├── SECURITY.md                # как сообщать об уязвимостях
├── CHANGELOG.md
├── package.json               # корень workspace (скрипты монорепо)
│
├── docs/                      # ВСЯ документация (этот каталог) — см. §docs
│
├── packages/                  # JS/TS-пакеты (npm) — инструменты и SDK
│   ├── core/                  # @aurobore/core — публичный базовый SDK
│   ├── cli/                   # @aurobore/cli — CLI (aurobore/bor)
│   ├── build/                 # @aurobore/build — сборка + кодогенерация
│   ├── bridge-js/             # JS-сторона моста (низкий уровень)
│   └── create-aurobore/       # генератор проектов (npm create aurobore)
│
├── runtime/                   # НАТИВНЫЙ контейнер (C++/QML) — шаблон проекта Аврора
│   ├── container/             # исходники контейнера (генерируется/линкуется при сборке)
│   ├── bridge-native/         # native-сторона моста
│   ├── transport/             # шов транспорта моста (тонкий)
│   │   ├── webview/           #   WebViewTransport (sendAsyncMessage/…; целевая)
│   │   └── loopback/          #   in-memory двойник для тестов
│   └── native-sdk/            # библиотека/контракты для авторов плагинов
│
├── plugins/                   # официальные (core) плагины
│   ├── device/
│   ├── storage/
│   ├── filesystem/
│   ├── clipboard/
│   ├── network/
│   ├── camera/                # (расширение)
│   ├── geolocation/           # (расширение)
│   └── …                      # каждый плагин = манифест + native/ + generated/ + docs/
│
├── templates/                 # шаблоны для `create`
│   ├── vanilla/
│   ├── react/
│   ├── vue/
│   └── svelte/
│
├── examples/                  # законченные демо-приложения
│   ├── hello-world/
│   ├── camera-demo/
│   ├── geo-demo/
│   └── …
│
├── tests/                     # сквозные/совместимостные тесты (см. §tests)
│   ├── e2e/
│   ├── conformance/           # conformance suite для плагинов/моста
│   └── fixtures/
│
├── tools/                     # вспомогательные скрипты разработки самого репо
│
└── .aurobore/ или .cursor/    # агентская конфигурация (skills/rules/контекст) — см. agents/
```

## 3. Назначение каталогов

### `docs/`
Вся проектная документация (архитектура, требования, ADR/RFC, roadmap, чек-листы, туториалы).
Структура — см. ниже §«Структура docs».

### `packages/` (JS/TS, публикуются в npm)
- **core** — публичный SDK (`@aurobore/core`): доступ к `Aurobore`, события, модель ошибок, типы.
- **cli** — командная строка (`aurobore`/`bor`): create/dev/build/run/plugin/doctor/publish.
- **build** — логика сборки и кодогенерации (используется CLI).
- **bridge-js** — низкоуровневая JS-сторона моста (корреляция, Promise, события, стримы, сериализация).
- **create-aurobore** — генератор проектов (`npm create aurobore`).

### `runtime/` (нативная часть, C++/QML)
- **container** — шаблон нативного контейнера Аврора (окно, WebView, lifecycle, навигация, splash, asset loader).
- **bridge-native** — native-сторона моста (валидация, маршрутизация, ошибки).
- **transport/** — тонкий шов [транспорта моста](architecture/bridge.md#транспорт): целевая реализация
  на WebView async API (`packages/bridge-js` `WebViewTransport`) + loopback-двойник для тестов (Gecko не поддерживается, ADR-004).
- **native-sdk** — контракты/библиотека для авторов плагинов (см. [native-sdk.md](architecture/native-sdk.md)).

### `plugins/`
Официальные плагины. Структура каждого:
```
plugins/<name>/
├── plugin.manifest     # SoT
├── native/             # C++/QML (пишет автор)
├── generated/          # JS-обёртка + .d.ts (кодоген, не редактировать)
├── package.json        # @aurobore/<name>
├── docs/
└── examples/
```

### `templates/`
Заготовки проектов для `create` (vanilla/react/vue/svelte). Минимальный рабочий каркас + `aurobore.config`.

### `examples/`
Полноценные демо-приложения, показывающие реальные сценарии (камера, гео, оффлайн и т.д.) — служат и
документацией, и площадкой для e2e-тестов.

### `tests/`
- **e2e/** — сквозные сценарии (создать → собрать → запустить → проверить мост).
- **conformance/** — тесты соответствия плагинов манифесту и поведению моста (FR-T1).
- **fixtures/** — тестовые данные/проекты.
- (Модульные тесты живут рядом с кодом в каждом пакете.)

### `tools/`
Скрипты обслуживания самого репозитория (релизы, генерация справочника API, проверки).

### Агентская конфигурация
Каталог со skills/rules/контекстом для агентской системы на базе Composer — см. [agents/README.md](agents/README.md).

## 4. Структура `docs/`

```
docs/
├── README.md                  # индекс/навигация
├── vision.md                  # видение
├── glossary.md                # глоссарий
├── requirements.md            # требования
├── repository-structure.md    # этот файл
├── roadmap.md                 # дорожная карта
├── checklists.md              # чек-листы
├── task.txt                   # исходная постановка (сохранена)
│
├── architecture/              # архитектура компонентов
│   ├── README.md  (обзор)
│   ├── runtime.md
│   ├── bridge.md
│   ├── plugin-system.md
│   ├── plugin-loader.md
│   ├── event-system.md
│   ├── configuration.md
│   ├── build-system.md
│   ├── dev-server.md
│   ├── cli.md
│   ├── typescript-sdk.md
│   └── native-sdk.md
│
├── plugins/                   # plugin api + каталог
│   ├── plugin-api.md
│   └── standard-plugins.md
│
├── agents/                    # агентская система (Composer)
│   └── README.md
│
├── adr/                       # Architecture Decision Records
│   ├── README.md
│   ├── ADR-000-template.md
│   └── ADR-001…ADR-009.md
│
├── rfc/                       # Request for Comments
│   ├── README.md
│   └── RFC-000-template.md
│
└── tutorials/                 # практические руководства (план)
    └── README.md
```

Назначение каждого раздела документации подробно описано в [docs/README.md](README.md) и
в [agents/README.md](agents/README.md) (для разделов, используемых агентами).

## 5. Разделение на пакеты: принципы

- **Граница «хост vs устройство»:** `packages/` — инструменты на машине разработчика; `runtime/` — то,
  что исполняется на устройстве. Общие контракты (формат сообщений, манифест, конфиг) — единые.
- **Каждый плагин — независимый npm-пакет** (`@aurobore/<name>`) с собственной версией.
- **Кодоген-артефакты отделены** (`generated/`) и не редактируются вручную.
- **Версионирование:** согласованное (changesets/релизный инструмент) с учётом совместимости
  протокола моста и Runtime.
