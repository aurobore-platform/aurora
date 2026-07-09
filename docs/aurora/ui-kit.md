# UI Kit Авроры и Aurobore

> Источник: [Проектирование и дизайн (UI Kit)](https://developer.auroraos.ru/doc/ui_kit), версия **ОС Аврора 5.2.1**.
> Cursor-правило для агента: `.cursor/rules/aurora-ui-kit.mdc`.

UI Kit описывает **нативный Silica-интерфейс** Авроры. Aurobore — WebView-платформа: основной UI приложения в вебе; UI Kit применяется к **нативной оболочке** контейнера и артефактам упаковки.

## Матрица соответствия

| Раздел UI Kit | Файлы Aurobore | Статус |
|---|---|---|
| Обложки (template, actions, preview) | `runtime/container/qml/cover/`, `CoverBridge`, `cover` в config | Реализовано (template + preview opt-in) |
| Экран заставки | `generateDesktop` → `[X-Aurora-SplashScreen]`, `SplashScreen.qml` | Реализовано |
| Иконки приложений | `packages/build/src/native/icons.ts`, `icons/` в native | Реализовано; doctor lint |
| Ориентация | `app.orientation` → `.desktop` `[X-Aurora-Application]` | Реализовано |
| Всплывающее меню | — | **Вне scope** (WebView SPA) |
| Панель приложения | — | **Вне scope** (`FillScreen` WebView) |
| Многопанельный режим (SplitView) | — | **Вне scope** |
| Silica Dialog / hybrid pages | `HttpAuthDialog.qml`, `CameraCapturePage.qml`, pickers | Следуем Silica-паттернам |

## Платформа vs автор приложения

| Ответственность | Кто |
|---|---|
| Cover, splash, desktop, иконки, ориентация | Aurobore (генерация + runtime) |
| Визуальный стиль SPA (кнопки, списки, навигация) | Автор приложения |
| Safe area, клавиатура, жест «назад» | Aurobore ([immersive-ui.md](../tutorials/immersive-ui.md)) |

## Конфиг → нативные артефакты

| Поле `aurobore.config` | Куда |
|---|---|
| `app.icon`, `app.iconMode` | PNG в `icons/`, `IconMode` в `.desktop` |
| `app.splash.background`, `gradientStart`, `gradientEnd` | `[X-Aurora-SplashScreen]`, `SplashScreen.qml` |
| `app.splash.image`, `showName` | In-app splash QML |
| `app.orientation` | `[X-Aurora-Application] Orientation=…` |
| `cover.mode` | `template` (default) или `preview` |
| `cover.actions` | `DefaultCover.qml` / `PreviewCover.qml` (до 4) |

См. [architecture/configuration.md](../architecture/configuration.md).

## Ссылки

- [Требования к .desktop](https://developer.auroraos.ru/doc/5.1.3/software_development/guidelines/rpm_requirements/desktop_requirements)
- [QML: обложка](https://developer.auroraos.ru/doc/5.1.0/software_development/guides/qml/qml_quick_start)
- [Cover API](../api/cover.md)

## Верификация

Строка **V-uikit** в [verification-status.md](verification-status.md): desktop-секции, splash gradient, иконка на cover, `cover.mode=preview`, `pnpm container:all`.
