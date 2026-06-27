# Changelog

Журнал изменений монорепо. Публикуемые пакеты `@aurobore/*` версионируются через
[changesets](.changeset/README.md); их пакетные changelog-и генерируются автоматически.

## [Unreleased]

### Added (M0 — Spike)

- Каркас монорепо: pnpm workspaces, Node >= 20, TypeScript, ESLint + Prettier, Vitest, changesets.
- Скелеты пакетов: `@aurobore/core`, `@aurobore/bridge-js`, `@aurobore/build`, `@aurobore/cli`, `create-aurobore`.
- Команда `aurobore doctor` — проверка окружения (Node, pnpm, Aurora SDK).
- Базовый CI (lint/typecheck/test) и плейсхолдер нативной сборки.
- PoC эхо-моста на реальном Aurora SDK (`runtime/poc-bridge/`).
