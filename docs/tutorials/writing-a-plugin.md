# Написание своего плагина (приложение)

App-facing гайд: добавить **собственный** плагин в проект приложения поверх `aurobore plugin create`.

> Для разработки **платформы** Aurobore (core-плагины в монорепо) см. [dev/adding-a-plugin.md](https://github.com/aurobore-platform/aurora/blob/main/docs/dev/adding-a-plugin.md) и [dev/native-plugin-guide.md](https://github.com/aurobore-platform/aurora/blob/main/docs/dev/native-plugin-guide.md).

## Когда нужен свой плагин

- Встроенные плагины ([список](../plugins/README.md)) не покрывают ваш сценарий.
- Нужен доступ к нативным API Аврора через мост с типизированным JS SDK.
- Плагин специфичен для одного приложения (корпоративный модуль, интеграция с SDK заказчика).

На этапе Alpha плагин живёт в каталоге **вашего проекта** (`./plugins/<name>/`). Публикация сторонних плагинов в npm — [FR-P7](https://github.com/aurobore-platform/aurora/blob/main/docs/requirements.md), этап Beta.

## 1. Создать скелет

В корне проекта приложения:

```bash
aurobore plugin create my-widget --display "My Widget"
```

Создаётся:

```
plugins/my-widget/
  plugin.manifest      # контракт API (источник правды)
  package.json
  native/              # C++ stub
  generated/           # JS/TS обёртка (не редактировать вручную)
  README.md
```

По умолчанию native-методы возвращают `MY_WIDGET_UNAVAILABLE` — приложение уже собирается, вызовы доходят до моста.

## 2. Описать API в манифесте

Откройте `plugins/my-widget/plugin.manifest`. Минимальный пример метода:

```json
{
  "methods": {
    "greet": {
      "args": { "name": "string" },
      "result": { "message": "string" }
    }
  },
  "errors": {
    "MY_WIDGET_UNAVAILABLE": {
      "message": "My Widget is not available on this device"
    }
  }
}
```

После изменения манифеста:

```bash
aurobore generate
```

## 3. Зарегистрировать в проекте

**package.json** — локальная зависимость:

```json
"dependencies": {
  "@aurobore/my-widget": "file:./plugins/my-widget"
}
```

**aurobore.config.json** — список плагинов:

```json
"plugins": ["@aurobore/echo", "@aurobore/my-widget"]
```

Или:

```bash
aurobore plugin add my-widget
```

## 4. Вызов из приложения

```ts
import { MyWidget } from "@aurobore/my-widget";

try {
  const result = await MyWidget.greet({ name: "Aurora" });
  console.log(result.message);
} catch (err) {
  // MY_WIDGET_UNAVAILABLE до реализации native
}
```

Обработка ошибок: [using-plugins.md](using-plugins.md).

## 5. Реализация native (опционально)

1. Реализуйте логику в `plugins/my-widget/native/MyWidgetPlugin.cpp`.
2. Уберите возврат `*_UNAVAILABLE` для готовых методов.
3. Пересоберите: `aurobore build`.

Если native-код лежит вне стандартных путей staging, задайте `AUROBORE_PLUGINS_ROOT` (см. README в каталоге плагина).

Разрешения и scopes — в манифесте (`permissions`, `scopes`); агрегация в `.desktop` при `aurobore build`.

## 6. Проверка

```bash
pnpm build          # или vite build
aurobore build
aurobore run
```

В journal контейнера должна быть строка `registered MyWidget` (имя из манифеста).

## Ограничения Alpha

| Возможность | Статус |
|-------------|--------|
| Плагин в `./plugins/` проекта приложения | Поддерживается |
| `plugin create` + `generate` + typed SDK | Поддерживается |
| Установка плагина из npm | Beta (FR-P7) |
| Плагин в монорепо платформы | См. [dev/adding-a-plugin.md](https://github.com/aurobore-platform/aurora/blob/main/docs/dev/adding-a-plugin.md) |

## См. также

- [plugin-api.md](../plugins/plugin-api.md) — контракт манифеста
- [dev/native-plugin-guide.md](https://github.com/aurobore-platform/aurora/blob/main/docs/dev/native-plugin-guide.md) — workflow в монорепо
- [using-plugins.md](using-plugins.md) — built-in плагины и `plugin add`
