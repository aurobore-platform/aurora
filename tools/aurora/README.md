# tools/aurora — dev-toolkit PoC (M0.5)

Скрипты для **разработчиков платформы Aurobore**: сборка и прогон PoC на эмуляторе без ручного
robocopy/sfdk/scp. Продуктовый CLI (`aurobore build/run`) появится в **M4**; здесь — тонкая обёртка
над тем же workflow, что использовался в M0.

## Быстрый старт

1. Скопируйте конфиг (один раз):

   ```powershell
   copy tools\aurora\local.env.example tools\aurora\local.env
   ```

   Отредактируйте пути при необходимости. На типичной установке Aurora SDK defaults подставятся сами
   (`C:\AuroraOS\bin`, SSH-ключ эмулятора).

2. Полный цикл:

   ```powershell
   pnpm poc:all
   ```

## Команды

| npm / node | Действие |
|---|---|
| `pnpm poc:sync` | `runtime/poc-bridge` → `POC_BUILD_DIR` (robocopy/rsync; пропуск, если пути совпадают) |
| `pnpm poc:build` | sync + `sfdk -c target=… build` |
| `pnpm poc:deploy` | эмулятор + scp RPM + `rpm -Uvh` |
| `pnpm poc:run` | эмулятор + запуск PoC + grep journal «PoC OK» |
| `pnpm poc:emulator` | только проверить/поднять эмулятор |
| `pnpm poc:all` | build → deploy → run |

Эквивалент: `node tools/aurora/poc.mjs <sync|build|deploy|run|emulator|all>`.

## Конфигурация (`local.env`)

| Переменная | По умолчанию | Назначение |
|---|---|---|
| `POC_BUILD_DIR` | `%USERPROFILE%\aurobore-spike\poc-bridge` | Staging для Docker build engine |
| `SFDK_TARGET` | `AuroraOS-5.2.1.200-x86_64` | Таргет sfdk |
| `AURORA_SDK_BIN` | `C:\AuroraOS\bin` (если есть) | PATH для sfdk |
| `EMULATOR_SSH_*` | `defaultuser@127.0.0.1:2223` | SSH к эмулятору |
| `EMULATOR_SSH_KEY` | ключ из vmshare SDK | Приватный ключ |
| `EMULATOR_BOOT_TIMEOUT` | `300` | Секунд ожидания после `emulator start` |

**Почему staging:** build engine монтирует только домашний каталог пользователя и `C:\AuroraOS`, не
произвольные пути вроде `C:\inetpub2026\aurora`. Если репозиторий уже лежит в mountable path и
`POC_BUILD_DIR` указывает на `runtime/poc-bridge` — **sync пропускается**.

## Файлы

- `poc.mjs` — оркестратор (Node, Windows/Linux/macOS)
- `run-poc.sh` — запуск на устройстве (LD_LIBRARY_PATH, journal-проверка)
- `local.env.example` — шаблон конфига

## Связь с M4

Логика sync/build/deploy/run станет основой `@aurobore/build` и команд `aurobore build` / `aurobore run`.
Dev-toolkit останется для CI и разработки самого монорепо.
