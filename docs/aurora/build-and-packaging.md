# Сборка и упаковка приложений ОС Аврора

> Источники: [`/doc/sdk/psdk/build`](https://developer.auroraos.ru/doc/sdk/psdk/build),
> [`/doc/sdk/app_development`](https://developer.auroraos.ru/doc/sdk/app_development),
> [`/doc/software_development/guidelines`](https://developer.auroraos.ru/doc/software_development/guidelines/webview).
> Версия документации: **ОС Аврора 5.2.1**.

## 1. Инструменты сборки

| Инструмент | Вариант SDK | Назначение |
|---|---|---|
| **`mb2`** | Аврора SDK (Build Engine) | Сборка проекта в эмулируемом окружении таргета |
| **`apptool`** | Аврора SDK (Build Tools) | Сборка через кросс-компиляцию (sysroot) |
| **`sb2`** | Platform SDK | Компиляция/запуск произвольного кода в окружении таргета |

Артефакты сборки у `mb2` и `apptool` **идентичны** (одинаковые макросы и флаги).

## 2. Сборка RPM через mb2 (пример из документации)

```bash
# 1. Клонировать тестовый проект
cd $HOME/AuroraPlatformSDK/projects/ && \
git clone git@hub.mos.ru:auroraos/demos/ApplicationTemplate.git && \
cd ApplicationTemplate

# 2. Собрать под armv7hl (имя таргета: AuroraOS-<номер_релиза>-base-<arch>)
mb2 --target AuroraOS-4.0.2.89-base-armv7hl build
# RPM появится в build/RPMS
```

> В Windows для этих команд используется **Git Bash** (нужен Unix-совместимый терминал).

## 3. Подпись RPM-пакета

RPM-пакеты для устройства **обязательно подписываются**. Ключ и сертификаты размещаются в рабочем
пространстве (например, `AuroraPlatformSDK/cert/`):

```bash
rpmsign-external sign \
    -k $HOME/AuroraPlatformSDK/cert/packages_key.pem \
    -c $HOME/AuroraPlatformSDK/cert/packages-cert.pem \
    RPMS/ru.auroraos.ApplicationTemplate-0.1-1.armv7hl.rpm
```

Тип сертификата подписи влияет на **профиль безопасности** при валидации пакета — см.
[requirements-and-conventions.md](requirements-and-conventions.md).

## 4. Доставка и установка на устройство

```bash
# Скопировать пакет на устройство
scp RPMS/ru.auroraos.ApplicationTemplate-0.1-1.armv7hl.rpm defaultuser@192.168.2.15:~

# Установить (в режиме суперпользователя)
ssh defaultuser@192.168.2.15
devel-su
pkcon install-local ru.auroraos.ApplicationTemplate-0.1-1.armv7hl.rpm
```

## 5. Сборка/запуск произвольного кода через sb2

Полезно для диагностики окружения таргета:

```bash
# Компиляция под armv7hl
sb2 -t AuroraOS-4.0.2.89-base-armv7hl gcc main.c -o test_armv7hl

# Запуск в окружении таргета (иначе Exec format error на хосте)
sb2 -t AuroraOS-4.0.2.89-base-armv7hl ./test_armv7hl
```

## 6. Артефакты упаковки (требования)

Из раздела «Рекомендации и требования» официальной документации:

- **`.spec`-файл** — спецификация RPM (имя пакета, версия, зависимости, файлы). Есть отдельные
  «Требования к оформлению .spec-файлов».
- **`.desktop`-файл** — точка входа приложения и **декларация разрешений/функций** (см.
  [sandbox-and-permissions.md](sandbox-and-permissions.md)). Есть «Требования к оформлению .desktop-файлов».
- **Конфигурация сборки** — **CMake** (`CMakeLists.txt`) или **qmake** (`.pro`).
- Имя пакета следует схеме `ru.<organization>.<App>` (в примерах — `ru.auroraos.<App>`),
  см. [adr/ADR-009](../adr/ADR-009-naming.md).

## 7. Иконки приложения

По шаблону [ApplicationTemplate](https://gitlab.com/omprussia/demos/ApplicationTemplate) и демо OMP:

| Элемент | Значение |
|---|---|
| Каталог в проекте | `icons/86x86/`, `icons/108x108/`, `icons/128x128/`, `icons/172x172/` |
| Формат | PNG, имя файла = **app id** (`ru.example.myapp.png`) |
| Поле `.desktop` | `Icon=<app id>` (без расширения) |
| Установка (CMake) | `install(FILES icons/<size>/${PROJECT_NAME}.png DESTINATION share/icons/hicolor/<size>/apps)` |
| Упаковка (`.spec`) | `%{_datadir}/icons/hicolor/*/apps/%{name}.png` или по одной строке на размер |

Размеры фиксированы: **86×86**, **108×108**, **128×128**, **172×172** (`AURORAAPP_ICONS` в `.pro`-шаблонах).

Aurobore генерирует каталог `icons/` в `.aurobore/native/` из `app.icon` (мастер SVG/PNG) или
`resources/icons/` (готовые PNG), см. [architecture/configuration.md](../architecture/configuration.md).

### Переводы (`translations/`)

По [гайду OMP](https://developer.auroraos.ru/doc/software_development/guides/localization/translations):
`.ts`-файлы Qt Linguist для **нативного** QML/C++ (`qsTr`), не для web. Aurobore генерирует
`<app.id>.ts` и `<app.id>-ru.ts` (имя на splash/cover из `app.name`), собирает `.qm` через
`qt5_add_translation` (Qt5 LinguistTools), устанавливает в `share/<app>/translations/`.
Отдельный `pkgconfig(auroraapp_i18n)` в SDK 5.2.1 как RPM-зависимость не поставляется (в qmake — `CONFIG += auroraapp_i18n`).

## 8. Проекция на Aurobore

| Что генерирует Aurobore | На основе |
|---|---|
| `CMakeLists.txt` нативного контейнера | конфиг проекта (`aurobore.config`) |
| `.spec` (имя `ru.<org>.<app>`, версия, зависимости, в т.ч. WebView) | конфиг + список плагинов/нативных зависимостей |
| `.desktop` (точка входа + разрешения) | секция permissions конфига |
| `icons/<size>/<app.id>.png` + install в `hicolor` | `app.icon` / `resources/icons/` / placeholder |
| `translations/<app.id>.ts` + `-ru.ts` → `.qm` | `app.name` (нативный splash/cover) |
| Вызов `mb2`/`apptool` под выбранный таргет | команда `aurobore build --arch <...>` |

Подробнее — [architecture/build-system.md](../architecture/build-system.md),
[architecture/configuration.md](../architecture/configuration.md), [adr/ADR-007](../adr/ADR-007-packaging-build.md).

## 9. Что верифицировать `(verify)`

Полный статус — в [verification-status.md](verification-status.md). Кратко:

- ✅ Подтверждено: `pkgconfig(aurorawebview)`, наличие `libcef`, RPM-упаковка + обязательная подпись, архитектуры/таргеты.
- ⚠️ Открыто (V-2/V-3): точное имя рантайм-RPM (`ru.auroraos.webview` vs `ru.aurora.webview`), `-devel`-пакет, бандл `libcef` и RPATH.
- ⏳ Открыто (V-6): актуальный синтаксис требований к `.spec`/`.desktop` для 5.2.x; имена сертификатов/профилей по каналам публикации.
