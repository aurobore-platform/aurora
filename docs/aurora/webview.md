# WebView в ОС Аврора

> Источники:
> [`/doc/5.1.6/.../web_and_content`](https://developer.auroraos.ru/doc/5.1.6/software_development/reference/web_and_content),
> [`/doc/5.1.3/.../webview_chromium`](https://developer.auroraos.ru/doc/5.1.3/software_development/reference/webview_chromium),
> [`/doc/software_development`](https://developer.auroraos.ru/doc/software_development).
> Версия документации: **ОС Аврора 5.1.x–5.2.x**. Полный реестр и статус проверки фактов — в
> [verification-status.md](verification-status.md).

## 1. Два фреймворка WebView

Официальный раздел «Веб и контент» перечисляет **два** фреймворка WebView:

| Фреймворк | Движок | Доступен с версии ОС |
|---|---|---|
| **Webview (Chromium)** | Chromium (на базе **CEF**) | **≥ 5.1.3** |
| **Webview (Gecko)** | Gecko | ≥ 4.0.2 |

Источник версий — таблица «с какой версии доступен API» в справочной документации.
**Целевой для Aurobore — Webview (Chromium)/CEF**; Gecko — легаси, вне поддержки ([ADR-004](../adr/ADR-004-webview-engine-abstraction.md)).

## 2. Базовый сценарий адаптации веб-приложения

Официальная документация: «Веб-приложение можно адаптировать для ОС Аврора при помощи фреймворка
**WebView**. Для этого следует **создать нативное приложение**, **подключить WebView** и
**интегрировать компоненты WebView в QML или C++-код**.» Именно это Aurobore автоматизирует, генерируя
нативный контейнер вместо ручной работы под каждый проект.

## 3. Официальный API WebView (Chromium)

> Из справочника «Фреймворк WebView (Chromium)». Подтверждено официальным источником.

**Подключение в сборке (qmake-пример из документации):**

```pro
PKGCONFIG += aurorawebview
```

**Инициализация (C++):**

```cpp
// 1) как можно раньше в main()
Aurora::WebView::WebEngineContext::StartProcess(argc, argv);

// 2) до создания экземпляра приложения
QGuiApplication::instance()->setAttribute(Qt::AA_ShareOpenGLContexts);

// 3) только ПОСЛЕ Aurora::Application::createView()
Aurora::WebView::WebEngineContext::InitBrowser();
```

**Использование как QML-компонента:**

```qml
import ru.auroraos.WebView 1.0

WebView {
    id: webView
    anchors.fill: parent

    TouchInput { id: touchInput; enabled: true }
    KeyboardInput { enabled: true }
}
```

Ключевой C++-класс — `Aurora::WebView::WebViewItem`; в справочнике есть раздел примеров и
отдельный проект-пример.

### Клавиатура (Chromium)

Aurobore использует **Chromium** WebView, не Gecko. Официальный гайд
[«Клавиатура с WebView»](https://developer.auroraos.ru/doc/5.1.3/software_development/guides/keyboard/webview_keyboard)
относится **только к Gecko** (`virtualKeyboardMargin`, `loadFrameScript` и т.п.).

Для Chromium в runtime-контейнере:

| Компонент | Назначение |
|---|---|
| `KeyboardInput { enabled: true }` | **Обязательно** — мост `<input>` → системная клавиатура; при `false` клавиатура не открывается |
| Фиксированная высота WebView (`screenAxisHeight()`) | WebView не сжимается при открытии клавиатуры (overlay) |
| `Qt.inputMethod.keyboardRectangle` | Primary-источник bottom inset → CSS vars |
| `navigator.virtualKeyboard.overlaysContent` | Стабильный `window.innerHeight` в CEF |

Подробности: [immersive-ui.md](../tutorials/immersive-ui.md).

## 4. Зависимости и упаковка

Подтверждённые факты (официальный справочник + перепроверка на примерах/сообществе):

| Назначение | Значение | Статус |
|---|---|---|
| `pkgconfig` для сборки | `aurorawebview` (`PKGCONFIG += aurorawebview`) | ✅ официально |
| QML-модуль | `ru.auroraos.WebView 1.0` | ✅ официально |
| C++ namespace | `Aurora::WebView::*` | ✅ официально |
| CEF-библиотека | `libcef` (напр. `/usr/lib/cef/libcef.so`) | ✅ (демо/практика) |
| RPM-зависимость рантайма | `ru.auroraos.webview` **или** `ru.aurora.webview` | ⚠️ **расхождение** `(verify)` |
| `-devel` пакет для сборки | `ru.auroraos.webview-devel` | 🟡 `(verify)` |

**CMake-практика** (из опыта сообщества; полезно для нашего генератора):

```cmake
find_library(WEBVIEW_LIB aurorawebview REQUIRED)
# проверка, что найден именно пакет ru.auroraos.webview (rpm -qf ...),
# при необходимости — бандл libcef внутрь RPM и правка RPATH:
set(CMAKE_INSTALL_RPATH "$ORIGIN/../lib:$ORIGIN/../lib/cef")
```

`.spec`-зависимости (пример из практики):

```spec
BuildRequires:  pkgconfig(aurorawebview)   # либо ru.auroraos.webview-devel (точное имя надёжнее)
Requires:       ru.auroraos.webview
```

> ⚠️ Расхождение имени рантайм-пакета (`ru.auroraos.webview` vs `ru.aurora.webview`) и точное имя
> `-devel` обязательно подтвердить на установленном SDK (`rpm -qf` / `zypper se`). См.
> [verification-status.md](verification-status.md) (V-2).

## 5. Мост JS ↔ C++ — официальный API WebView (подтверждён)

Chromium-WebView (`ru.auroraos.WebView`) предоставляет **собственный асинхронный message-API** — именно
на нём строится мост Aurobore. Сигнатуры подтверждены исходниками официального демо
[WebViewAPI](https://hub.mos.ru/auroraos/demos/WebViewAPI) (OMP, BSD-3-Clause, 2024).

**Нативная сторона (QML), компонент `WebView`:**

| Метод / сигнал | Назначение |
|---|---|
| `webView.sendAsyncMessage(name, data)` | отправить сообщение **native → web** |
| `webView.addMessageListener(name)` | зарегистрировать обработчик сообщений от web |
| сигнал `onRecvAsyncMessage(name, data)` | приём сообщения **web → native** |
| `webView.runJavaScript(code, onSuccess, onError)` | выполнить JS в странице (**native → web**) |

**Веб-сторона (JS):**

| Функция | Назначение |
|---|---|
| глобальная `sendAsyncMessage(name, data)` | отправить сообщение **web → native** |
| функции страницы (напр. `receiveMessage(...)`) | вызываются из натива через `runJavaScript(...)` |

Пример (сокращённо, из демо):

```qml
import ru.auroraos.WebView 1.0

WebView {
    id: webView
    url: htmlRootPath + "/html/AsyncMessages.html"
    TouchInput {}

    Component.onCompleted: {
        webView.addMessageListener("appMessageHandler1");
        webView.addMessageListener("appMessageHandler2");
    }
}

Connections {
    target: webView
    onRecvAsyncMessage: {                       // параметры: name, data
        if (name === "appMessageHandler1")
            webView.runJavaScript("receiveMessage(" + data + ")", function (a) {}, function (a) {});
    }
}
// отправка в web:
webView.sendAsyncMessage("appMessageHandler1", payload);
```

```js
// веб-страница
function receiveMessage(counter) { /* вызывается из натива через runJavaScript */ }
btn.addEventListener('click', function () {
    sendAsyncMessage("appMessageHandler2", counter);   // web → native
});
```

**Инициализация WebView** (из `src/main.cpp` демо): `Aurora::WebView::WebEngineContext::StartProcess(...)`
как можно раньше в `main()`; атрибут `Qt::AA_ShareOpenGLContexts` до создания приложения; затем
`InitBrowser(...)` после `Aurora::Application::createView()` (в новых версиях —
`InitBrowser(argc, argv, {"--default-encoding=UTF-8"})`, выбор пути — через макросы `MAJOR`/`MINOR`).
`OrganizationName = "ru.auroraos"`; ресурсы — через `PackageFilesLocation` (контекст-свойство `htmlRootPath`).

**Как это ложится на наш мост** ([ADR-002](../adr/ADR-002-bridge-model.md)):
- `invoke → Promise`: корреляция по id поверх `sendAsyncMessage`/`onRecvAsyncMessage`;
- события и стримы: те же async-сообщения с именами-каналами;
- сериализация: JSON в `data`.

**Уровни ниже / что не используем:** под капотом WebView — CEF (`CefMessageRouter`/`window.cefQuery`,
`CefFrame::ExecuteJavaScript`), но интегрируемся мы на уровне **wrapper-API `ru.auroraos.WebView`**, а CEF
считаем деталью/fallback ([ADR-004](../adr/ADR-004-webview-engine-abstraction.md)). **Qt WebChannel** не
применяется (только для QtWebEngine). Легаси **Gecko**-специфика (`loadFrameScript`,
`navigator.qt.postMessage`) — другой фреймворк, не используем. *(Примечание: `addMessageListener` и
`onRecvAsyncMessage` — это API Chromium-обёртки, подтверждён демо; не путать с frame-script-моделью Gecko.)*

> ✅ **V-1 закрыт:** точные сигнатуры моста подтверждены официальным демо.
> См. [verification-status.md](verification-status.md).

## 6. Официальные демо и возможности WebView

Официальные примеры (Mos.Hub; лицензия допускает использование в сторонних приложениях):

| Демо | Что показывает |
|---|---|
| [WebViewBrowser](https://hub.mos.ru/auroraos/demos/WebViewBrowser) | Минимальное приложение-браузер на **CEF**-движке |
| [WebViewAPI](https://hub.mos.ru/auroraos/demos/WebViewAPI) | Полный набор возможностей WebView API (работает с 5.1.3) |

**WebViewAPI** подтверждает, что штатный WebView API даёт всё, на чём строится Aurobore:

- **Async messages** (web↔native) → наш **мост** (invoke/события/стримы), [ADR-002](../adr/ADR-002-bridge-model.md);
- **Выполнение JavaScript** (native→JS) → доставка событий и инъекция bridge-скрипта;
- **URL filtering** → контроль навигации + Asset Loader/безопасная схема ([runtime.md](../architecture/runtime.md));
- **SSL-провайдеры** (в т.ч. CryptoPro), **JS-диалоги**, **приватный режим**, **загрузка файла в HTML-форму**,
  **скачивание файла** → кандидаты в возможности Runtime/плагинов.

Структура демо (`html/`, `qml/`, `src/main.cpp`, `rpm/*.spec`, `*.desktop`) совпадает с нашим пониманием
нативного проекта Аврора.

> **Уточнение транспорта (важно для MVP).** Раз WebView предоставляет **собственный** асинхронный
> message-API + `runJavaScript`, наш тонкий [шов транспорта](../adr/ADR-004-webview-engine-abstraction.md)
> логично строить **поверх официального WebView API**, а низкоуровневый `cefQuery`/`CefMessageRouter` —
> рассматривать как деталь/fallback. Архитектуру это не меняет (плагинов шов не касается), но уточняет цель PoC по V-1.
>
> Примечание: демо собраны через **qmake** (`*.pro`), тогда как Aurobore генерирует **CMake**
> ([ADR-007](../adr/ADR-007-packaging-build.md)) — оба пути официально поддерживаются, это не противоречие.

## 7. Связь с архитектурой Aurobore

- [architecture/runtime.md](../architecture/runtime.md) — контейнер, lifecycle, asset loader.
- [architecture/bridge.md](../architecture/bridge.md) — мост JS ↔ C++.
- [adr/ADR-001](../adr/ADR-001-runtime-architecture.md), [adr/ADR-002](../adr/ADR-002-bridge-model.md),
  [adr/ADR-004](../adr/ADR-004-webview-engine-abstraction.md), [adr/ADR-007](../adr/ADR-007-packaging-build.md).

## 8. Смежный путь: PWA

ОС Аврора отдельно поддерживает **PWA** (в т.ч. установку из браузера) — иной путь доставки, чем у
Aurobore (нативный контейнер + мост + плагины). Держим как точку сравнения, но это не наша модель.
