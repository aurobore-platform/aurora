# tools/aurora — dev-toolkit PoC / M1–M3 container (M0.5+)

Скрипты для **разработчиков платформы Aurobore**: сборка и прогон нативных проектов на эмуляторе без ручного
robocopy/sfdk/scp. Продуктовый CLI (`aurobore build/run`) появится в **M4**; здесь — тонкая обёртка
над тем же workflow, что использовался в M0/M1/M3.

## Быстрый старт

1. Скопируйте конфиг (один раз):

   ```powershell
   copy tools\aurora\local.env.example tools\aurora\local.env
   ```

   Отредактируйте пути при необходимости. На типичной установке Aurora SDK defaults подставятся сами
   (`C:\AuroraOS\bin`, SSH-ключ эмулятора).

2. Полный цикл PoC (M0):

   ```powershell
   pnpm poc:all
   ```

3. Полный цикл контейнера (M1/M2/M3):

   ```powershell
   pnpm container:all
   ```

## Команды

### PoC (`poc-bridge`, по умолчанию)

| npm / node | Действие |
|---|---|
| `pnpm poc:sync` | `runtime/poc-bridge` → `POC_BUILD_DIR` (robocopy/rsync; пропуск, если пути совпадают) |
| `pnpm poc:build` | sync + `sfdk -c target=… build` |
| `pnpm poc:deploy` | эмулятор + scp RPM + `rpm -Uvh` |
| `pnpm poc:run` | эмулятор + запуск PoC + grep journal «PoC OK» |
| `pnpm poc:emulator` | только проверить/поднять эмулятор |
| `pnpm poc:all` | build → deploy → run |

### Container (`runtime/container` + M3 plugins)

| npm / node | Действие |
|---|---|
| `pnpm codegen:plugins` | Кодоген JS/TS + `PluginRegistry` + `aurobore-plugins.js` (см. ниже) |
| `pnpm container:sync` | sync container + extraSync (bridge-native, native-sdk, plugins) |
| `pnpm container:build` | codegen (если нужен) + sync + `sfdk build` → RPM |
| `pnpm container:deploy` | эмулятор + установка RPM |
| `pnpm container:run` | запуск + journal «M3 OK» |
| `pnpm container:emulator` | только эмулятор |
| `pnpm container:all` | build → deploy → run |

Эквивалент: `node tools/aurora/poc.mjs <sync|build|deploy|run|emulator|all> [poc-bridge|container]`.
Проект можно задать env `RUNTIME_PROJECT=container`.

### Когда не нужен `container:all`

| Ситуация | Достаточно |
|---|---|
| Изменили только manifest/генератор | `pnpm test` + `pnpm codegen:plugins` |
| Изменили C++/QML, RPM ещё нет | `pnpm container:build` |
| RPM уже собран | `pnpm container:deploy` + `pnpm container:run` |
| Полная регрессия на эмуляторе | `pnpm container:all` (~5 мин) |

## Кодоген плагинов (`pnpm codegen:plugins`)

Генерирует из `plugins/*/plugin.manifest`:

- `plugins/<name>/generated/index.{js,d.ts}`
- `runtime/container/generated/PluginRegistry.{h,cpp}`
- `runtime/container/html/js/aurobore-plugins.js`

`container:build` вызывает codegen автоматически. Если манифесты и генератор не менялись — шаг
**пропускается** (fingerprint в `.codegen-plugins.stamp` в корне репо).

## Staging layout (container)

```
%USERPROFILE%\aurobore-spike\
├── aurobore-container/    ← POC_BUILD_DIR, cwd sfdk
├── bridge-native/         ← extraSync
├── native-sdk/
└── plugins/
```

**extraSync** для проекта `container` в `poc.mjs`: помимо `runtime/container` копируются три sibling-дерева.
CMake в staging ссылается на `../plugins`, `../native-sdk`, `../bridge-native`.

**Почему staging:** build engine монтирует только домашний каталог пользователя и `C:\AuroraOS`, не
произвольные пути вроде `C:\inetpub2026\aurora`. Если репозиторий уже лежит в mountable path и
`POC_BUILD_DIR` указывает на `runtime/container` — **sync пропускается**.

## Journal markers (container)

| Маркер | Этап |
|---|---|
| `M1 OK: aurobore-app loaded…` | Runtime, SPA |
| `M2 OK: bridge invoke, events, stream verified` | Echo conformance |
| `M3 OK: plugins registered, Device + Storage verified` | Plugin system |
| `[aurobore-plugin] registered …` | Каждый плагин при старте |

`run-container.sh` ждёт **M3 OK** (таймаут `POC_RUN_WAIT_SEC`, по умолчанию 90 с).

## Конфигурация (`local.env`)

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `POC_BUILD_DIR` | `%USERPROFILE%\aurobore-spike\poc-bridge` или `…\aurobore-container` | Staging для Docker build engine |
| `RUNTIME_PROJECT` | `poc-bridge` | `poc-bridge` или `container` (3-й аргумент `poc.mjs`) |
| `SFDK_TARGET` | `AuroraOS-5.2.1.200-x86_64` | Таргет sfdk |
| `AURORA_SDK_BIN` | `C:\AuroraOS\bin` (если есть) | PATH для sfdk |
| `EMULATOR_SSH_*` | `defaultuser@127.0.0.1:2223` | SSH к эмулятору |
| `EMULATOR_SSH_KEY` | ключ из vmshare SDK | Приватный ключ |
| `EMULATOR_BOOT_TIMEOUT` | `300` | Секунд ожидания после `emulator start` |
| `POC_RUN_WAIT_SEC` | `90` | Секунд опроса journal на M3 OK |

## Файлы

- `poc.mjs` — оркестратор (Node, Windows/Linux/macOS); проекты `poc-bridge` и `container`
- `run-poc.sh` — запуск PoC на устройстве (LD_LIBRARY_PATH, journal-проверка)
- `run-container.sh` — запуск контейнера (journal M3 OK)
- `local.env.example` — шаблон конфига

## Связь с M4

Логика sync/build/deploy/run станет основой `@aurobore/build` и команд `aurobore build` / `aurobore run`.
Dev-toolkit останется для CI и разработки самого монорепо.

## См. также

- [docs/dev/native-plugin-guide.md](../../docs/dev/native-plugin-guide.md) — workflow плагинов
- [runtime/container/README.md](../../runtime/container/README.md) — структура контейнера
