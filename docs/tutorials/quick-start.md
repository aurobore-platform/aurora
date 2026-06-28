# Быстрый старт

Пошаговое руководство: от нуля до приложения на эмуляторе Аврора.

> Пример в репозитории: [`examples/hello-world/`](../../examples/hello-world/).

## Требования

- Node.js 20 LTS, pnpm
- Аврора SDK (mb2), эмулятор, сертификаты подписи RPM
- На Windows: Git Bash для команд `mb2`/`sfdk`

Подробнее: [README.md](../../README.md#требования-к-окружению-разработчика).

## 1. Установка CLI

Из корня монорепо Aurobore:

```bash
pnpm install
pnpm --filter @aurobore/cli build
pnpm link --global
```

Проверка окружения:

```bash
aurobore doctor
```

## 2. Создание проекта

```bash
aurobore create MyApp --template vanilla
cd MyApp
pnpm install
```

Шаблон `vanilla` — TypeScript + `@aurobore/core` + typed plugin imports.
Для минимального plain JS используйте `--template minimal`.

## 3. Сборка web-части

```bash
pnpm build:web
```

Скрипт собирает `src/ts/app.ts` в `dist/js/app.js` и копирует HTML/CSS.

## 4. Сборка нативного пакета

```bash
aurobore build
```

Генерируется нативный проект Аврора (CMake + `.spec` + `.desktop`), собирается RPM через `mb2`.

## 5. Запуск на эмуляторе

```bash
aurobore run
```

Или режим разработки с live reload:

```bash
aurobore dev
```

## 6. Проверка моста

В созданном проекте нажмите **Echo ping** — в статусе должно появиться `pong=true`.
Полный набор демо: [`examples/hello-world/`](../../examples/hello-world/).

## Дальше

- [Использование плагинов](using-plugins.md)
- [События и lifecycle](events-and-lifecycle.md)
- [Справочник API](../api/README.md)
