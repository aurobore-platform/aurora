# Build System (система сборки)

> web → нативный проект Аврора (CMake/RPM) → пакет. Архитектура без реализации.
> Решение по упаковке — [ADR-007](../adr/ADR-007-packaging-build.md).

Build System превращает веб-приложение + конфиг + плагины в устанавливаемый пакет Аврора (RPM).
Ключевой принцип — **детерминированная генерация**: пользователь не правит нативные артефакты вручную.

## 1. Этапы сборки

```
aurobore build
 ├─ 1. Валидация конфига и манифестов плагинов
 ├─ 2. Сборка веба (делегируется сборщику пользователя: vite/webpack/rollup или статичные файлы)
 ├─ 3. Кодогенерация: JS-обёртки и TS-типы плагинов (если не сгенерированы)
 ├─ 4. Генерация нативного проекта Аврора (контейнер Runtime):
 │      • структура C++/QML
 │      • CMakeLists (find_package, target_link_libraries, RPATH-настройки)
 │      • .spec (BuildRequires/Requires из nativeDeps плагинов)
 │      • .desktop (имя, иконки, разрешения, deep-link схемы)
 │      • иконки по разрешениям, splash
 ├─ 5. Внедрение веб-ресурсов в пакет + JS-bridge + реестр плагинов
 ├─ 6. Подключение нативных частей плагинов и их зависимостей
 ├─ 7. Вызов штатной сборки Aurora SDK (CMake → rpmbuild)
 └─ 8. Артефакт: пакет .rpm (+ отчёт сборки)
```

## 2. Делегирование сборки веба

- Aurobore **не диктует** веб-сборщик: пользователь использует свой (Vite/Webpack/Rollup/любой) или
  статические файлы. Build System лишь знает, **где** лежит результат (`web.root`).
- Это сохраняет совместимость с любым фронтенд-стеком (React/Vue/Svelte/Vanilla).

## 3. Генерация нативного проекта (контейнера)

- Контейнер Runtime — шаблонизированный нативный проект; Build System подставляет в него конфиг,
  список плагинов, ресурсы.
- Источник истины для нативных зависимостей — `nativeDeps` манифестов плагинов; из них собираются
  `BuildRequires`/`Requires` в `.spec` и зависимости CMake.
- **Поиск библиотек** через `find_package`/pkgconfig с приоритетом точных RPM-имён (а не «угадывания»),
  с учётом известных проблем RPATH/зависимостей WebView. (Заметка из исследования сборки на Аврора.)
- При генерации `.aurobore/native` (`generateNativeProject`) из `runtime/container` исключается
  `qml/verification/` — harness W3–W6 для dev-toolkit, не для user RPM. Harness доступен только через
  `pnpm container:*` (sync из repo root без exclude); см. [runtime/container/README.md](../../runtime/container/README.md).

## 4. Движок WebView

- Целевой движок — **Chromium/CEF** ([ADR-004](../adr/ADR-004-webview-engine-abstraction.md)); Gecko не поддерживается.
- Подключается пакет CEF-WebView: `ru.auroraos.webview` (`BuildRequires: pkgconfig(aurorawebview)` /
  `ru.auroraos.webview-devel`, `Requires: ru.auroraos.webview`) — точные имена верифицируются на SDK.
- Транспорт моста — единственная реализация на WebView async API (`WebViewTransport`; см. [bridge.md](bridge.md#транспорт)).
- `build.minOs` задаёт минимальную версию ОС (Chromium-линейка, ориентир 5.1.5/5.1.6+).
- **Гибридные приложения** (bundled SPA + external HTTPS): в `aurobore.config.json` задают
  `web.allowedOrigins` — массив origin-only URL (`https://host`, без path). Поле проецируется в
  `config/defaults.json` при `aurobore build`; runtime применяет whitelist в URL policy, HTTP auth и cookies.
  Непустой whitelist требует permission `Internet`. Пример: [`examples/hybrid-demo/`](../../examples/hybrid-demo/).

## 5. Требования к окружению

- Требуется **Aurora SDK** (target/PSDK) в окружении сборки; наличие проверяет `aurobore doctor`.
- Сборка предпочтительно через **CMake** (гибче qmake — вывод из исследования), упаковка — **RPM**.
- Поддержка целевых архитектур (`build.targets`).

## 6. Детерминированность и воспроизводимость

- Одинаковый вход (конфиг + плагины + веб) → одинаковый нативный проект и пакет (NFR-11).
- Сгенерированные артефакты помечаются как «generated» и не редактируются вручную.
- Кэширование промежуточных результатов для ускорения повторных сборок.

## 7. Режимы сборки

| Режим | Назначение |
|---|---|
| `--mode dev` | Быстрая сборка/запуск, источник веба — Dev Server, без оптимизаций |
| `--mode prod` | Полная сборка, минификация веба, готовый `.rpm` |
| профили | Разные конфиги/переменные окружения |

## 8. Результат и отчёт

- Артефакт: `.rpm` (и метаданные).
- Отчёт сборки: использованные плагины и версии, разрешения, движок, размер пакета, предупреждения.

## 9. OTA-артефакты (FR-C14)

Команда `aurobore update publish` формирует **подписанный OTA-бандл** (tar.gz + `manifest.json` +
`manifest.sig`) для канала (`stable`/`beta`). Runtime применяет его через UpdateManager (см. [runtime.md](runtime.md) §13).
Локальная проверка: `examples/ota-demo`, `pnpm ota:serve`. Подробнее — [dev/ota-updates.md](../dev/ota-updates.md).

## 10. Связи

- ↔ [Configuration](configuration.md) — главный вход.
- ↔ [Plugin System](plugin-system.md)/[Loader](plugin-loader.md) — реестр плагинов и нативные зависимости.
- ↔ [Runtime](runtime.md) — генерируемый контейнер.
- ↔ [CLI](cli.md) — точка запуска (`build`, `run`).
- ↔ [Dev Server](dev-server.md) — источник веба в dev-режиме.
