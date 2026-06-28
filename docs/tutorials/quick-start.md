# Быстрый старт

Пошаговое руководство: от нуля до приложения на эмуляторе Аврора.

> Пример в репозитории: [`examples/hello-world/`](../../examples/hello-world/).

## Требования

- Node.js 20 LTS, pnpm
- Аврора SDK (mb2), эмулятор, сертификаты подписи RPM
- На Windows: Git Bash для команд `mb2`/`sfdk`

Подробнее: [README.md](../../README.md#требования-к-окружению-разработчика).

## 1. Установка CLI

**Из npm** (для приложений и демо — рекомендуется):

```bash
npm install -g @aurobore/cli
aurobore doctor
```

**Из монорепо** (разработка платформы Aurobore):

```bash
pnpm install
pnpm --filter @aurobore/cli build
pnpm link --global
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

### Существующий проект (Vue / Vite / свой сборщик)

Подробная инструкция: **[demo-existing-app.md](demo-existing-app.md)**.

Кратко — **`aurobore init`** вместо `create`: создаст `aurobore.config.json`, скрипты в `package.json`
и `.aurobore/` в `.gitignore`:

```bash
cd my-vue-app
aurobore init          # интерактивно
# или без вопросов:
aurobore init -y --id ru.example.myvue --name "My Vue App"
```

Затем соберите web как обычно и упакуйте в RPM:

```bash
pnpm build             # vite build → dist/
pnpm build:aurora      # web + aurobore build (скрипт добавляет init)
pnpm aurora:run
```

Для Vite проверьте `base: '/'` в `vite.config` (не путь вида `/repo-name/`).
Aurobore не заменяет ваш сборщик — он только упаковывает каталог `web.root` (по умолчанию `dist`).

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
