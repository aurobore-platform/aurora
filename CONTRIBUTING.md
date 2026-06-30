# Вклад в Aurobore

Спасибо за интерес к проекту! Aurobore — монорепо (pnpm workspaces); JS/TS-инструментарий живёт в
`packages/`, нативная часть (C++/QML) — в `runtime/` и `plugins/`.

## Окружение

- Node.js LTS (>= 20), pnpm (через `corepack enable`).
- Для нативной сборки/запуска — Aurora SDK (mb2) + эмулятор (см. [README](README.md#требования-к-окружению-разработчика)).
- Проверить окружение: `pnpm run doctor` (в монорепо; не путать со встроенным `pnpm doctor`).
- Прогон PoC на эмуляторе (M0.5): скопировать `tools/aurora/local.env.example` → `local.env`, затем `pnpm poc:all` (см. [tools/aurora/README.md](tools/aurora/README.md)).

## Быстрый старт

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm lint
```

## Процесс

1. Архитектурные решения фиксируются как ADR (`docs/adr/`), обсуждения — RFC (`docs/rfc/`).
2. Изменения публикуемых пакетов `@aurobore/*` сопровождаются changeset: `pnpm changeset`.
3. Перед PR убедитесь, что проходят `typecheck`, `test`, `lint`, `format:check`.
4. Коммиты — осмысленные; PR описывает «зачем», а не только «что».

## Стиль кода

- TypeScript strict; форматирование — Prettier; правила — ESLint.
- Кодоген-артефакты (`generated/`) не редактируются вручную.
