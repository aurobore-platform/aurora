# Aurobore — платформа для создания WebView-приложений под ОС Аврора

> **Aurobore** (рабочее кодовое имя, см. [ADR-009](adr/ADR-009-naming.md)) — открытая платформа,
> позволяющая разрабатывать приложения для ОС Аврора на стандартном вебе (HTML/CSS/JS)
> с доступом к нативным возможностям системы через типизированный мост и систему плагинов.
> Аналог Cordova / Capacitor / Tauri, спроектированный с учётом особенностей Аврора (Qt/QML + C++).

Документация описывает архитектуру, **операционные гайды** для разработки в монорепо (см. [dev/](dev/README.md)) и **туториалы для авторов приложений** (см. [tutorials/](tutorials/README.md)).

---

## Для разработчиков приложений

| Документ | Назначение |
|---|---|
| [tutorials/quick-start.md](tutorials/quick-start.md) | Установка CLI, create, build, run |
| [tutorials/using-plugins.md](tutorials/using-plugins.md) | Плагины, импорты, ошибки |
| [tutorials/events-and-lifecycle.md](tutorials/events-and-lifecycle.md) | События, стримы, lifecycle |
| [api/README.md](api/README.md) | Справочник `@aurobore/core` и CLI |

Пример: [`examples/hello-world/`](../examples/hello-world/).

---

## Как читать эту документацию

Рекомендуемый порядок чтения для нового участника проекта:

1. [Видение проекта](vision.md) — что мы строим и почему.
2. [Глоссарий](glossary.md) — единый язык терминов.
3. [Функциональные требования](requirements.md) — что система должна уметь.
4. [Обзор архитектуры](architecture/README.md) — как устроена система в целом.
5. Углублённые документы по компонентам (Runtime, Bridge, Plugin System и т.д.).
6. [Дорожная карта](roadmap.md) и [чек-листы](checklists.md) — как мы будем двигаться.
7. При работе с нативным кодом и плагинами — [dev/](dev/README.md).

---

## Карта документации

### Разработка (`dev/`)

| Документ | Назначение |
|---|---|
| [dev/README.md](dev/README.md) | Индекс операционных гайдов |
| [dev/native-plugin-guide.md](dev/native-plugin-guide.md) | Workflow M3: codegen, staging, сборка, Qt-подводные камни |
| [dev/adding-a-plugin.md](dev/adding-a-plugin.md) | Чеклист добавления нового плагина |

### Основа
| Документ | Назначение |
|---|---|
| [vision.md](vision.md) | Видение, цели, не-цели, ключевые архитектурные принципы |
| [glossary.md](glossary.md) | Термины и сокращения |
| [requirements.md](requirements.md) | Функциональные и нефункциональные требования |
| [repository-structure.md](repository-structure.md) | Структура репозитория (монорепо) |
| [roadmap.md](roadmap.md) | Этапы: Research → Design → MVP → Alpha → Beta → RC → 1.0 |
| [mvp-plan.md](mvp-plan.md) | Детальный план этапа MVP (майлстоуны M0…M5, первый шаг — PoC моста) |
| [checklists.md](checklists.md) | Чек-листы: архитектура, инфраструктура, Runtime, Bridge, CLI, SDK, тесты, релиз |

### Архитектура (`architecture/`)
| Документ | Назначение |
|---|---|
| [architecture/README.md](architecture/README.md) | Обзор слоёв и потоков данных |
| [architecture/runtime.md](architecture/runtime.md) | Нативный контейнер (запуск, WebView, lifecycle, навигация, splash, deep links, permissions, asset loader) |
| [architecture/bridge.md](architecture/bridge.md) | Мост JS ↔ C++: жизненный цикл вызова, Promise/события/стримы, сериализация, ошибки |
| [architecture/plugin-system.md](architecture/plugin-system.md) | Модель плагина, манифест, версионирование, разрешения |
| [architecture/plugin-loader.md](architecture/plugin-loader.md) | Обнаружение, регистрация и экспорт плагинов в Runtime |
| [architecture/event-system.md](architecture/event-system.md) | Системные и пользовательские события, подписки, стримы |
| [architecture/configuration.md](architecture/configuration.md) | `aurobore.config` и генерация артефактов Аврора |
| [architecture/build-system.md](architecture/build-system.md) | Сборка: web → проект Аврора (CMake/RPM) → пакет |
| [architecture/dev-server.md](architecture/dev-server.md) | Dev Server, Live Reload, Hot Reload |
| [architecture/cli.md](architecture/cli.md) | Архитектура CLI |
| [architecture/typescript-sdk.md](architecture/typescript-sdk.md) | Публичный TypeScript SDK и кодогенерация |
| [architecture/native-sdk.md](architecture/native-sdk.md) | Нативный C++/QML SDK для авторов плагинов |

### Плагины (`plugins/`)
| Документ | Назначение |
|---|---|
| [plugins/plugin-api.md](plugins/plugin-api.md) | Архитектура Plugin API (что такое плагин, сущности, контракт) |
| [plugins/standard-plugins.md](plugins/standard-plugins.md) | Каталог стандартных плагинов и их зоны ответственности |

### Агентская система (`agents/`)
| Документ | Назначение |
|---|---|
| [agents/README.md](agents/README.md) | Агентская архитектура на базе Composer: роли, skills, контекст, делегирование |

### Справочник по ОС Аврора (`aurora/`)
| Документ | Назначение |
|---|---|
| [aurora/README.md](aurora/README.md) | Кураторская выжимка официальной документации ОС Аврора (SDK, сборка, WebView, песочница) с проекцией на Aurobore |

### Решения и предложения
| Каталог | Назначение |
|---|---|
| [adr/](adr/README.md) | Architecture Decision Records — зафиксированные решения |
| [rfc/](rfc/README.md) | Request for Comments — предложения, ещё не принятые |
| [tutorials/](tutorials/README.md) | Практические руководства для разработчиков приложений |
| [api/](api/README.md) | Справочник публичного SDK (MVP) |

---

## Статус

| Этап | Статус |
|---|---|
| Research (исследование) | ✅ выполнено (см. источники в [vision.md](vision.md)) |
| Design (проектирование) | ✅ завершён (2026-06-27): ADR-001…009 Accepted, чек-листы §1/§3 подписаны |
| MVP (реализация) | 🟢 текущий этап — см. [roadmap.md](roadmap.md) и [mvp-plan.md](mvp-plan.md) |

> Исходная постановка задачи сохранена в [task.txt](task.txt) и использовалась как отправная точка.
> Там, где исследование выявило более удачные решения, они вынесены в ADR с обоснованием.
