# Immersive UI и system chrome

> **Основной путь:** приложения из `aurobore create` (vanilla/minimal) **сразу** корректно ложатся под status bar — писать safe-area CSS не нужно.

Runtime всегда работает в единственном режиме (без настроек в конфиге):

1. WebView **на весь экран** — якоря `top`/`left`/`right` и фиксированная высота `screenAxisHeight()` (`Screen.height` / `Screen.width` по ориентации, включая перевёрнутые). WebView **не** `anchors.fill`: при открытии клавиатуры Silica сжимает `Page`, но CEF остаётся полноэкранным.
2. `ApplicationWindow`: `displayMode: "FillScreen"`, `statusbarForceVisible: true`.
3. Инъектирует CSS-переменные `--aurobore-safe-area-*` (и алиасы `--safe-area-inset-*`) из `SafeZoneRect` / status bar. Native QML-значения калибруются в **CSS px** WebView: `webCssScale = innerHeight / screenAxisHeight()` (fallback `1 / devicePixelRatio` до загрузки страницы). Событие `systemChrome:insetsChanged` и CSS vars используют те же CSS px.
4. Подключает `aurobore-chrome.css` — padding на `html` из этих переменных.
5. Нормализует `viewport-fit=cover` в meta viewport (в т.ч. при dev-сервере).
6. Клавиатура **overlay** (Chromium WebView):
   - `KeyboardInput { enabled: true }` — **обязательно**; при `enabled: false` клавиатура не показывается.
   - Bottom inset: **`Qt.inputMethod.keyboardRectangle`** → `injectInsets()` и событие `systemChrome:insetsChanged`.
   - JS: `navigator.virtualKeyboard.overlaysContent = true` — стабильный `window.innerHeight`.
   - Fallback: `visualViewport` → `aurobore:keyboard-inset`, если `Qt.inputMethod` вернул 0.

> **Gecko vs Chromium:** официальный гайд [«Клавиатура с WebView»](https://developer.auroraos.ru/doc/5.1.3/software_development/guides/keyboard/webview_keyboard) относится только к Gecko. Aurobore использует **Chromium** (`ru.auroraos.WebView`); см. [webview.md](../aurora/webview.md) §«Клавиатура».

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
