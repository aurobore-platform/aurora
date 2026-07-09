# Туториалы

Пошаговые практические руководства для разработчиков приложений Aurobore.

> **Онлайн:** [aurobore-platform.github.io/aurora/tutorials/](https://aurobore-platform.github.io/aurora/tutorials/)

## MVP + Alpha (готово)

| Туториал | Результат |
|---|---|
| [Быстрый старт](quick-start.md) | CLI → create → build → run на эмуляторе |
| [Демо: свой Vue/Vite сайт](demo-existing-app.md) | npm CLI → init → dist → эмулятор (без клонирования репо) |
| [Шаблоны React/Vue/Svelte](framework-templates.md) | `create --template`, адаптеры, примеры в `examples/` |
| [Написание своего плагина](writing-a-plugin.md) | `plugin create` → манифест → вызов из приложения |
| [Использование плагинов](using-plugins.md) | plugin add, typed imports, обработка ошибок |
| [События и lifecycle](events-and-lifecycle.md) | on/once, стримы, aurobore:ready |
| [Deep links](deep-links.md) | Регистрация схем, `deeplink` / `appurlopen`, маршрутизация в SPA |
| [Immersive UI / system chrome](immersive-ui.md) | Zero-config insets, fullscreen WebView, overlay keyboard (fixed geometry) |
| [Обложка (cover)](cover.md) | Формальная обложка по умолчанию; opt-in actions и `cover.setState` |

Дополнительно (гайды в `dev/`, для full-документации):

| Тема | Документ |
|---|---|
| Browser mock (`dev --web`) | [web-mock-mode.md](../dev/web-mock-mode.md) |
| W3C polyfills (перенос PWA) | [w3c-polyfills.md](../dev/w3c-polyfills.md) |
| OTA live-updates | [ota-updates.md](../dev/ota-updates.md) |

Примеры: [`examples/hello-world/`](https://github.com/aurobore-platform/aurora/tree/main/examples/hello-world), [`react-demo`](https://github.com/aurobore-platform/aurora/tree/main/examples/react-demo), [`vue-demo`](https://github.com/aurobore-platform/aurora/tree/main/examples/vue-demo), [`svelte-demo`](https://github.com/aurobore-platform/aurora/tree/main/examples/svelte-demo), [`w3c-demo`](https://github.com/aurobore-platform/aurora/tree/main/examples/w3c-demo), [`ota-demo`](https://github.com/aurobore-platform/aurora/tree/main/examples/ota-demo).

Справочник API: [api/README.md](../api/README.md).

## Запланировано (Beta+)

| Туториал | Этап |
|---|---|
| Сборка и запуск на устройстве | MVP (частично в quick-start) |
| Отладка через DevTools | Beta |
| Публикация в стор / npm | RC |
| Миграция между версиями | Post-1.0 |

## Принципы

- Один результат на туториал; рабочий пример в `examples/`.
- Минимум теории — ссылки на архитектурные документы для деталей.
- Шаги воспроизводимы на чистом окружении.
