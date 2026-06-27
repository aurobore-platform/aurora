# План этапа MVP

> Детализация этапа 2 ([roadmap.md](roadmap.md)) — сквозной путь «веб-приложение → запуск на Авроре».
> Критерии приёмки — в [requirements.md](requirements.md) §6. Принцип: каждую гипотезу проверяем на
> **реальном Aurora SDK**, а не на предположениях.

## Порядок майлстоунов

```
M0 (Spike/PoC) ─► M0.5 Dev-toolkit ─► M1 Runtime ─► M2 Bridge ─► M3 Plugins ─► M4 CLI/Build ─► M5 SDK/Docs
   мост на SDK     poc:sync/build/     контейнер     invoke/      манифест + 5    create/dev/    @aurobore/core
   + инфра         deploy/run/all      + WebView     события      плагинов        build/run      + шаблон
```

---

## M0.5 — Dev-toolkit: цикл PoC одной командой

**Цель:** убрать ручной robocopy/sfdk/scp/ssh между итерациями M1; не путать с продуктовым CLI (M4).

- [x] Оркестратор `tools/aurora/poc.mjs`: **sync** → **build** → **deploy** → **run** + **all**.
- [x] Конфиг `tools/aurora/local.env` (из `local.env.example`): staging-dir, таргет sfdk, SSH эмулятора.
- [x] Автопроверка эмулятора (SSH доступен → ок; иначе `sfdk emulator start` + ожидание).
- [x] npm-скрипты в корне: `pnpm poc:sync|build|deploy|run|all`.
- [x] Документация в `tools/aurora/README.md` и ссылка из `runtime/poc-bridge/README.md`.

**Выход M0.5:** разработчик платформы гоняет PoC на эмуляторе без копирования команд из чата; логика позже мигрирует в `aurobore build/run` (M4).

---

## M0 — Spike: мост на реальном SDK + инфраструктура ⚑ первый шаг

**Цель:** до фиксации транспорта руками потрогать мост на устройстве/эмуляторе и поднять каркас репо.

- [x] **PoC моста** на реальном Aurora SDK по подтверждённым сигнатурам
      ([aurora/webview.md](aurora/webview.md) §5): нативный контейнер с `ru.auroraos.WebView`,
      `sendAsyncMessage`/`onRecvAsyncMessage`/`addMessageListener`/`runJavaScript`, эхо web↔native.
      Закрывает практикой V-1 ([aurora/verification-status.md](aurora/verification-status.md)).
- [x] Подтвердить открытые пункты упаковки при сборке PoC: имя RPM-пакета WebView (V-2),
      `libcef`/RPATH (V-3), разрешения в `.desktop` (V-6).
- [x] **Инфраструктура:** монорепо (pnpm workspaces), Node 20 LTS (`engines`/`packageManager`),
      базовый CI (линт/типы/тесты JS), скелеты пакетов из [repository-structure.md](repository-structure.md).
- [x] Зафиксировать окружение сборки (Aurora SDK mb2, таргеты) и проверку через `aurobore doctor`.

**Выход M0:** доказано, что мост работает на Авроре; решение по транспорту зафиксировано; репо готово к коду.

## M1 — Runtime (минимальный контейнер)
FR-R1…R6. См. [architecture/runtime.md](architecture/runtime.md), [ADR-001](adr/ADR-001-runtime-architecture.md).

- [ ] Нативный контейнер (C++/QML) + WebView во весь экран, bootstrap, инициализация WebEngineContext.
- [ ] Asset Loader: локальные ресурсы через безопасную схему `aurobore-app://` (не `file://`).
- [ ] Lifecycle (ready/pause/resume), splash, SPA-навигация + аппаратная «назад».

## M2 — Bridge (поверх WebView API)
FR-B1…B6. См. [architecture/bridge.md](architecture/bridge.md), [ADR-002](adr/ADR-002-bridge-model.md).

- [ ] Тонкий шов транспорта **поверх** `sendAsyncMessage`/`onRecvAsyncMessage`/`runJavaScript`
      + loopback-двойник для тестов ([ADR-004](adr/ADR-004-webview-engine-abstraction.md)).
- [ ] `invoke → Promise` с корреляцией по id; двунаправленные события; базовые стримы.
- [ ] Структурированные ошибки (код/сообщение/данные) → reject; JSON-сериализация; проверка источника/разрешений.

## M3 — Plugin System + Codegen + плагины MVP
FR-P1…P5, FR-S1…S3. См. [plugins/plugin-api.md](plugins/plugin-api.md), [ADR-003](adr/ADR-003-plugin-api.md), [ADR-008](adr/ADR-008-typescript-sdk-codegen.md).

- [ ] Формат манифеста (SoT); статическая регистрация; проверка совместимости.
- [ ] Кодоген JS-обёрток и TS-типов из манифеста.
- [ ] Плагины: **Device, Storage, FileSystem, Clipboard, Network**.

## M4 — CLI + Config/Build
FR-C1…C6, FR-CF1…CF3. См. [architecture/cli.md](architecture/cli.md), [architecture/build-system.md](architecture/build-system.md), [ADR-007](adr/ADR-007-packaging-build.md).

- [ ] `aurobore.config` + валидация.
- [ ] Детерминированная генерация нативного проекта: **CMake + `.spec` + `.desktop`** (разрешения из конфига).
- [ ] Команды: `create`, `dev` (live reload), `build` (→ `mb2`/RPM + подпись), `run`, `plugin add/remove/list`, `doctor`.

## M5 — SDK + шаблон + пример + документация
FR-S1…S3, FR-D1…D2.

- [ ] `@aurobore/core` (API, события, модель ошибок, типы).
- [ ] Шаблон `vanilla` + рабочий пример (`hello-world`/эхо-мост).
- [ ] Доки: быстрый старт, написание плагина, базовый API.

---

## Критерий выхода MVP
Выполнены FR-R1…R7, FR-B1…B6, FR-P1…P5, FR-C1…C6, FR-CF1…CF3, FR-S1…S3, FR-D1…D2 и NFR-1,2,6,7
(см. [requirements.md](requirements.md) §6). Прогон Runtime/Bridge/Plugin/CLI/SDK-чек-листов
([checklists.md](checklists.md) §4–§8).

## Открытые верификации, закрываемые по ходу MVP
Из [aurora/verification-status.md](aurora/verification-status.md): V-2 (имя RPM), V-3 (libcef/RPATH),
V-6 (`.desktop`) — в M0/M4; V-4 (qtium-driver 5.2.0), V-5 (мин. версия ОС), V-7 (бенчмарк моста) — по ходу.

## Окружение
См. [требования в README](../README.md#требования-к-окружению-разработчика): Node 20 LTS + pnpm,
Аврора SDK (mb2) + эмулятор + сертификаты подписи; на Windows — Git Bash + режим разработчика.
