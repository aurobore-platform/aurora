# Configuration (конфигурация проекта)

> `aurobore.config` и проекция в артефакты Аврора. Архитектура без реализации.
> Формат — [ADR-006](../adr/ADR-006-configuration-format.md).

Конфигурация — единая декларация проекта, из которой выводятся нативные артефакты Аврора. Цель —
«конвенции вместо конфигурации»: разумные значения по умолчанию, конфиг описывает только отклонения.

## 1. Файл `aurobore.config`

Один файл в корне проекта (формат фиксируется в ADR-006; по умолчанию — JSON, c опцией TS/JS для
динамики). Концептуальная структура:

```
configVersion: 1
app:
  id: "ru.example.app"          // appId (обратный домен)
  name: "Demo"
  version: "1.0.0"
  orientation: "portrait"       // portrait | landscape | auto
  icon: "resources/icon.svg"
  splash: { image: "…", background: "#000" }
web:
  root: "dist"                  // каталог собранного веба
  entry: "index.html"
  devServer: { port: 5173 }
permissions: ["Internet", "camera", "location"]
plugins:
  - "@aurobore/device"
  - "@aurobore/storage"
  - "@aurobore/camera"
build:
  engine: "chromium"           // целевой движок WebView (CEF/Chromium); Gecko вне поддержки — см. ADR-004
  minOs: "5.1.5"               // минимальная версия ОС Аврора (Chromium-линейка)
  targets: ["aurora-armv7hl", "aurora-aarch64"]
deepLinks:
  schemes: ["myapp"]
```

## 2. Проекция в артефакты Аврора (build-time)

CLI/Build System детерминированно генерируют нативный проект из конфига + манифестов плагинов:

| Источник в конфиге | Куда проецируется |
|---|---|
| `app.id`, `app.name`, `app.version` | Имена/метаданные проекта, `.spec`, `.desktop` |
| `permissions` (+ из манифестов плагинов) | Разрешения в `.desktop` (напр. `Internet`) |
| `plugins` + их `nativeDeps` | `BuildRequires`/`Requires` в `.spec`, зависимости CMake |
| `app.orientation`, `splash`, `icon` | QML/ресурсы контейнера; **иконки лаунчера** — PNG 86/108/128/172 в `icons/` |
| `deepLinks.schemes` | Регистрация URI-схем в `.desktop`/манифесте Аврора |
| `web.root`/`entry` | Встраивание веб-ресурсов, базовый путь Asset Loader |
| `build.engine`/`targets` | Выбор реализации движка/транспорта, цели сборки |

> Разработчик **не редактирует** сгенерированные `.spec`/`.desktop`/CMake вручную (NFR-11).

### Иконки (`app.icon`)

При `aurobore build` в `.aurobore/native/icons/` создаются PNG по гайдлайнам Аврора:

| Способ | Путь в проекте |
|---|---|
| Мастер-изображение (рекомендуется) | `app.icon`: `resources/icon.svg` или `.png` (≥172×172) — ресайз в 4 размера |
| Готовые PNG | `resources/icons/86x86/<app.id>.png` … `172x172/` (или каталог `icons/` в корне) |
| По умолчанию | Placeholder из runtime, если ничего не задано (`doctor` предупреждает) |

Имя файла = `app.id`; в `.desktop` — `Icon=<app.id>`. Установка в RPM: `share/icons/hicolor/<size>/apps/`.
См. [aurora/build-and-packaging.md](../aurora/build-and-packaging.md) §7.

## 3. Слияние конфигурации

Итоговая конфигурация = `aurobore.config` **+** агрегированные требования манифестов плагинов
(разрешения, нативные зависимости) **+** значения по умолчанию. Конфликты (например, плагин требует
разрешение, которого нет в `permissions`) разрешаются предсказуемо: требования плагинов добавляются и
проверяются `doctor`, спорные случаи подсвечиваются предупреждением.

## 4. Окружения (профили)

Поддержка профилей (dev/prod) для разных значений (например, `web.root` указывает на Dev Server в dev и
на собранный `dist` в prod). Профиль выбирается командой CLI (`--mode`).

## 5. Версионирование и миграции

- `configVersion` фиксирует версию формата.
- При смене формата CLI предлагает миграцию (`aurobore migrate`, COULD) с понятным diff.
- Неизвестные поля валидируются и сообщаются, а не молча игнорируются.

## 6. Валидация

- Схема конфига валидируется CLI на каждом запуске (`doctor`, `build`, `dev`).
- Понятные ошибки: отсутствующий appId, неверный формат версии, неизвестный плагин, конфликт разрешений.

## 7. Связи

- ↔ [Build System](build-system.md) — основной потребитель конфига.
- ↔ [CLI](cli.md) — чтение/валидация/миграция.
- ↔ [Runtime](runtime.md) — встроенная конфигурация — производная от `aurobore.config`.
- ↔ [Plugin System](plugin-system.md) — агрегация требований плагинов.
