# Прикладная разработка под ОС Аврора: рабочий цикл

> Источник: [`/doc/sdk/app_development/work`](https://developer.auroraos.ru/doc/sdk/app_development/work).
> Версия документации: **ОС Аврора 5.2.1**.

## 1. Базовая модель

Приложения для ОС Аврора пишутся на **C++/Qt** с **QML** для описания интерфейса. Создание ведётся в
IDE на базе Qt Creator и в целом совпадает с разработкой под другие десктоп/мобильные платформы.
Ключевые отличия:

- **сборка** выполняется в отдельной **среде сборки** (Build Engine / Build Tools);
- **запуск** — в **эмуляторе** или на **внешнем устройстве** с ОС Аврора;
- приложение исполняется в **песочнице** (изоляция) — см. [sandbox-and-permissions.md](sandbox-and-permissions.md).

## 2. Три шага до работающего приложения

1. **Создать или открыть проект.**
2. **Собрать проект** (кросс-компиляция под целевую архитектуру в среде сборки).
3. **Запустить приложение** (эмулятор или устройство).

В процессе доступны **отладка** и **профилирование**.

## 3. Проекция на Aurobore

Aurobore автоматизирует именно эти шаги для веб-разработчика, скрывая C++/QML:

| Шаг Аврора | Что делает Aurobore | Документ |
|---|---|---|
| Создать проект | `aurobore create` генерирует нативный проект-контейнер из шаблона | [architecture/cli.md](../architecture/cli.md), [repository-structure.md](../repository-structure.md) |
| Собрать проект | `aurobore build` → генерация CMake/RPM → штатный `mb2`/`apptool` | [architecture/build-system.md](../architecture/build-system.md), [build-and-packaging.md](build-and-packaging.md) |
| Запустить | `aurobore run` (эмулятор/устройство) + Dev Server для итерации | [architecture/dev-server.md](../architecture/dev-server.md) |
| Отладка | DevTools моста + штатные средства (gdb, runtime-manager-tool) | [architecture/bridge.md](../architecture/bridge.md) |

> Принцип: Aurobore **не подменяет** штатный цикл Аврора, а порождает корректные входные артефакты
> (нативный проект, `.spec`, `.desktop`, CMake, **иконки**) и вызывает официальные инструменты сборки/запуска.

### Структура: ApplicationTemplate vs Aurobore

| ApplicationTemplate (корень нативного проекта) | Aurobore (репозиторий пользователя) | Aurobore (`.aurobore/native/` при build) |
|---|---|---|
| `*.desktop`, `CMakeLists.txt`, `rpm/*.spec` | `aurobore.config.json` + web (`src/`, `dist/`) | генерируется |
| `icons/<size>/<app.id>.png` | `resources/icon.svg` или `resources/icons/` | `icons/<size>/<app.id>.png` |
| `qml/`, `src/` | — (скрыто в runtime) | из контейнера |
| `translations/*.ts` | — (этап 2) | планируется |

## 4. Отладка и профилирование

- Доступны отладка и профилирование приложения средствами SDK/IDE.
- Для **изолированных** (песочница) приложений отладка имеет особенности: используется `gdb` или
  утилита `runtime-manager-tool` (см. [sandbox-and-permissions.md](sandbox-and-permissions.md)).

## 5. Что верифицировать `(verify)`

- Точная структура шаблона проекта (`ApplicationTemplate`) и набор стартовых файлов конкретной версии SDK.
- Команды запуска на устройстве/эмуляторе для текущей версии IDE/CLI.
