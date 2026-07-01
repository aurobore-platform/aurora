# Туториалы

Пошаговые практические руководства для разработчиков приложений Aurobore.

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

Примеры: [`examples/hello-world/`](../../examples/hello-world/), [`react-demo`](../../examples/react-demo/), [`vue-demo`](../../examples/vue-demo/), [`svelte-demo`](../../examples/svelte-demo/).

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
