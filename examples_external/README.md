# examples_external — внешние референсы

Локальный каталог для **клонов чужого кода** (Flutter community plugins, демо OMP и т.п.).
Содержимое клонов **не коммитится** в git — только этот README и `manifest.json`.

## Назначение

- Читать platform-код (C++/QML, `.spec`, CMake) при доработке Aurobore runtime и плагинов.
- Не импортировать файлы в сборку монорепо.
- Не копипастить Dart / MethodChannel — переносить только логику доступа к ОС и упаковку.

## Синхронизация

Из корня репозитория:

```powershell
pnpm external:sync
```

Один референс по id:

```powershell
pnpm external:sync -- webview-flutter
```

Скрипт: [tools/aurora/sync-external-examples.mjs](../tools/aurora/sync-external-examples.mjs).
Каталог репозиториев: [manifest.json](manifest.json).

## Первый референс: webview-flutter

| Поле | Значение |
|---|---|
| id | `webview-flutter` |
| Путь | `flutter/webview-flutter/` |
| Ветка | `flutter-aurora-3.35.7` |
| URL | https://hub.mos.ru/auroraos/flutter/flutter-community-plugins/webview-flutter.git |

Ключевые файлы после sync:

- `packages/webview_flutter_aurora/README.md` — конфигурация RPM/CMake, InitQCA
- `packages/webview_flutter_aurora/CHANGELOG.md` — поддерживаемые API и ограничения
- `packages/webview_flutter/example/aurora/main.cpp` — bootstrap WebView
- `packages/webview_flutter/example/aurora/CMakeLists.txt`, `aurora/rpm/*.spec`

План улучшений Aurobore по мотивам этого плагина:
[docs/dev/webview-improvements-plan.md](../docs/dev/webview-improvements-plan.md).

## Для агента

1. Перед анализом Flutter-плагина: `pnpm external:sync -- webview-flutter`.
2. Смотреть `packages/*_aurora/` и `example/aurora/`, не Dart в `lib/`.
3. Новые референсы — добавить запись в `manifest.json`, затем `pnpm external:sync`.
