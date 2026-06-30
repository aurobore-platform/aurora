# Changelog

Журнал изменений монорепо. Публикуемые пакеты `@aurobore/*` версионируются через
[changesets](.changeset/README.md); их пакетные changelog-и генерируются автоматически.

## [Unreleased]

### Added

- **Иконки лаунчера (гайдлайны Аврора):** `aurobore build` генерирует `icons/{86,108,128,172}x*/<app.id>.png`,
  устанавливает в `share/icons/hicolor/`, обновляет `%files` в `.spec`. Источник: `app.icon`,
  `resources/icons/` или placeholder. `doctor` проверяет наличие кастомной иконки; шаблоны и `init`
  добавляют `resources/icon.svg`. Зависимость `@aurobore/build`: `sharp`.

### Added (M0 — Spike)

- Каркас монорепо: pnpm workspaces, Node >= 20, TypeScript, ESLint + Prettier, Vitest, changesets.
- Скелеты пакетов: `@aurobore/core`, `@aurobore/bridge-js`, `@aurobore/build`, `@aurobore/cli`, `create-aurobore`.
- Команда `aurobore doctor` — проверка окружения (Node, pnpm, Aurora SDK).
- Базовый CI (lint/typecheck/test) и плейсхолдер нативной сборки.
- PoC эхо-моста на реальном Aurora SDK (`runtime/poc-bridge/`).
