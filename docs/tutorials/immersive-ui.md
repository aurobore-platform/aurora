# Immersive UI и system chrome

> **Основной путь:** приложения из `aurobore create` (vanilla/minimal) **сразу** корректно ложатся под status bar — писать safe-area CSS не нужно.

Runtime по умолчанию:

1. Инъектирует CSS-переменные `--aurobore-safe-area-*` (и алиасы `--safe-area-inset-*`).
2. Подключает `aurobore-chrome.css` — padding на `html` из этих переменных.
3. Нормализует `viewport-fit=cover` в meta viewport (в т.ч. при dev-сервере).
4. Обновляет bottom inset при клавиатуре: native `virtualKeyboardMargin` (Gecko) или **visualViewport** (Chromium).

## Конфиг `systemChrome`

В `aurobore.config.json` (все поля опциональны):

```json
{
  "systemChrome": {
    "insets": "auto",
    "overlayWebView": false,
    "statusBarStyle": "default"
  }
}
```

| Поле | Значения | Поведение |
|------|----------|-----------|
| `insets` | `auto` (default) \| `manual` | `manual` — opt-out встроенного padding (immersive / edge-to-edge) |
| `overlayWebView` | `false` (default) \| `true` | `false` — WebView под status bar нативно; `true` — контент на весь экран, отступы только через CSS |
| `statusBarStyle` | `light` \| `dark` \| `default` | Рекомендация для native chrome; на Aurora SDK 5.2.x status bar управляется ОС |

## Edge-to-edge и fixed header

Для фиксированных toolbar/header поверх контента:

```css
@import "@aurobore/core/css/aurobore-chrome.css";

.my-toolbar {
  /* padding-top только у fixed-блока, не у всего html */
}
```

Или утилита из `@aurobore/core`:

```html
<header class="aurobore-edge-to-edge">…</header>
```

При `insets: "manual"` runtime добавляет класс `aurobore-insets-manual` на `<html>` — padding на `html` сбрасывается.

## Событие `systemChrome:insetsChanged`

Для кастомных fixed-элементов (редко нужно в типичном приложении):

```js
Aurobore.on("systemChrome:insetsChanged", ({ top, right, bottom, left }) => {
  // bottom > 0 — клавиатура; top — status bar / cutout
});
```

## Аппаратная «назад»

Runtime перехватывает `Qt.Key_Back` и вызывает `window.__auroboreSpaBack()` (History API). Если истории нет — событие `backbutton`.

Жест «назад» Silica на корневой странице сворачивает приложение (поведение ОС). SPA-навигация — через history или `Aurobore.on("backbutton", …)`.

См. также [events-and-lifecycle.md](events-and-lifecycle.md).
