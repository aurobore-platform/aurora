# tools/aurora — dev-toolkit PoC / M1 container (M0.5+)

Скрипты для **разработчиков платформы Aurobore**: сборка и прогон нативных проектов на эмуляторе без ручного
robocopy/sfdk/scp. Продуктовый CLI (`aurobore build/run`) появится в **M4**; здесь — тонкая обёртка
над тем же workflow, что использовался в M0/M1.

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

3. Полный цикл M1-контейнера:

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

### M1 container (`runtime/container`)

| npm / node | Действие |
|---|---|
| `pnpm container:sync` | `runtime/container` → `%USERPROFILE%\aurobore-spike\aurobore-container` |
| `pnpm container:build` | sync + `sfdk build` → RPM |
| `pnpm container:deploy` | эмулятор + установка RPM |
| `pnpm container:run` | запуск + journal «M1 OK» |
| `pnpm container:emulator` | только эмулятор |
| `pnpm container:all` | build → deploy → run |

Эквивалент: `node tools/aurora/poc.mjs <sync|build|deploy|run|emulator|all> [poc-bridge|container]`.
Проект можно задать env `RUNTIME_PROJECT=container`.

## Конфигурация (`local.env`)

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `POC_BUILD_DIR` | `%USERPROFILE%\aurobore-spike\poc-bridge` | Staging PoC для Docker build engine |
| `RUNTIME_PROJECT` | `poc-bridge` | `poc-bridge` или `container` (3-й аргумент `poc.mjs`) |
| `SFDK_TARGET` | `AuroraOS-5.2.1.200-x86_64` | Таргет sfdk |
| `AURORA_SDK_BIN` | `C:\AuroraOS\bin` (если есть) | PATH для sfdk |
| `EMULATOR_SSH_*` | `defaultuser@127.0.0.1:2223` | SSH к эмулятору |
| `EMULATOR_SSH_KEY` | ключ из vmshare SDK | Приватный ключ |
| `EMULATOR_BOOT_TIMEOUT` | `300` | Секунд ожидания после `emulator start` |
| `POC_RUN_WAIT_SEC` | `60` | Секунд опроса journal на «PoC OK» |

**Почему staging:** build engine монтирует только домашний каталог пользователя и `C:\AuroraOS`, не
произвольные пути вроде `C:\inetpub2026\aurora`. Если репозиторий уже лежит в mountable path и
`POC_BUILD_DIR` указывает на `runtime/poc-bridge` — **sync пропускается**.

## Файлы

- `poc.mjs` — оркестратор (Node, Windows/Linux/macOS); проекты `poc-bridge` и `container`
- `run-poc.sh` — запуск PoC на устройстве (LD_LIBRARY_PATH, journal-проверка)
- `run-container.sh` — запуск M1-контейнера (journal «M1 OK»)
- `local.env.example` — шаблон конфига

## Связь с M4

Логика sync/build/deploy/run станет основой `@aurobore/build` и команд `aurobore build` / `aurobore run`.
Dev-toolkit останется для CI и разработки самого монорепо.
