# Immersive UI и system chrome

> **Основной путь:** приложения из `aurobore create` (vanilla/minimal) **сразу** корректно ложатся под status bar — писать safe-area CSS не нужно.

Runtime всегда работает в единственном режиме (без настроек в конфиге):

1. WebView **на весь экран** (`anchors.fill`), без native top margin.
2. Инъектирует CSS-переменные `--aurobore-safe-area-*` (и алиасы `--safe-area-inset-*`) из `SafeZoneRect` / status bar.
3. Подключает `aurobore-chrome.css` — padding на `html` из этих переменных.
4. Нормализует `viewport-fit=cover` в meta viewport (в т.ч. при dev-сервере).
5. Клавиатура **overlay** (`KeyboardInput` выключен, WebView не сжимается, `window.innerHeight` стабилен): bottom inset через **visualViewport → native** `injectInsets` и событие `systemChrome:insetsChanged`.

## Edge-to-edge и fixed header

Для immersive UI без padding на всём `html` — сбросьте padding в своём CSS; CSS vars и событие `insetsChanged` остаются доступны:

```css
html {
  padding: 0;
}
```

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
