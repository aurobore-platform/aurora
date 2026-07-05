# План улучшений WebView (по референсу webview-flutter)

> Детализация задач **post-A2** для runtime-контейнера — по мотивам Aurora-реализации
> [`webview_flutter_aurora`](https://hub.mos.ru/auroraos/flutter/flutter-community-plugins/webview-flutter/-/tree/flutter-aurora-3.35.7/packages/webview_flutter_aurora)
> (ветка `flutter-aurora-3.35.7`). Локальный клон: `examples_external/flutter/webview-flutter/` (`pnpm external:sync`).

## Контекст

Aurobore и `webview_flutter_aurora` используют **один стек**: `ru.auroraos.WebView`, CEF,
`Aurora::WebView::WebEngineContext::InitBrowser`, async messages (`sendAsyncMessage` / `runJavaScript`).

Flutter-плагин — **не замена архитектуры**, а карта того, что OMP уже закрыли для Flutter-приложений:
упаковка subprocess, QCA/TLS, HTTP auth, cookies, lifecycle WebView. Переносим **паттерны**, не Dart/MethodChannel.

### Уже реализовано в Aurobore (не трогать без нужды)

| Область | Реализация |
|---|---|
| Asset loader + secure context | [`AssetSchemeServer`](../../runtime/container/src/AssetSchemeServer.cpp), SPKI в [`main.cpp`](../../runtime/container/src/main.cpp) |
| Bridge | `aurobore:bridge`, [`BridgeRouter`](../../runtime/bridge-native/BridgeRouter.cpp) |
| URL policy | [`LoadRequestExtension`](../../runtime/container/qml/pages/WebAppPage.qml) |
| System chrome / keyboard (A2) | insets, `KeyboardInput`, `visualViewport` fallback |
| CEF debug | `AUROBORE_CEF_DEBUG_PORT` в `main.cpp` |
| HTTP Basic Auth (W4) | [`WebViewAuthBridge`](../../runtime/container/src/WebViewAuthBridge.cpp), plugin `webview` |
| Cookies (W5) | [`WebViewCookieBridge`](../../runtime/container/src/WebViewCookieBridge.cpp), plugin `webview` |
| WebView dispose / recreate (W6) | `Loader` + `teardownWebView` / `recreateWebView` в [`WebAppPage.qml`](../../runtime/container/qml/pages/WebAppPage.qml); `WebEngineContext::Shutdown()` в [`main.cpp`](../../runtime/container/src/main.cpp) |

### Что у Flutter есть, у нас пока нет

| Область | Flutter-референс |
|---|---|
| RPM: `webview-subprocess` + `cryptopro-checker` | example `aurora/rpm/*.spec`, README §Configuration |
| InitQCA (QtCrypto) | `WebviewFlutterAuroraPluginInitQCA()` в [`webview_flutter_aurora_plugin.cpp`](../../examples_external/flutter/webview-flutter/packages/webview_flutter_aurora/aurora/webview_flutter_aurora_plugin.cpp) |
| WebView dispose | [`WebviewController::Dispose`](../../examples_external/flutter/webview-flutter/packages/webview_flutter_aurora/aurora/webview_controller.cpp) — **реализовано W6** (Loader-recreate) |

### Явно не переносим

- Dart / MethodChannel / Flutter PlatformView / texture registrar
- CEF bundling из [flutter_linux_webview](https://github.com/access-company/flutter_linux_webview) (desktop Linux tarball)
- ScrollTo / scrollBy / getScrollPosition (full-page web в контейнере)
- `onNavigationRequest` / `onSslAuthError` — на Aurora **не поддерживаются** (README плагина)

---

## W1 — Инфраструктура `examples_external` ✅

**Цель:** локальные клоны внешних референсов без коммита чужого кода.

| Артефакт | Путь |
|---|---|
| Каталог + manifest | [`examples_external/`](../../examples_external/) |
| Sync-скрипт | [`tools/aurora/sync-external-examples.mjs`](../../tools/aurora/sync-external-examples.mjs) |
| Команда | `pnpm external:sync [-- id]` |

**Критерий:** `pnpm external:sync -- webview-flutter` клонирует репо; key files помечены ✓ в выводе.

---

## W2 — Упаковка: webview-subprocess + cryptopro-checker (приоритет: высокий, M4) ✅

**Цель:** сгенерированный RPM пользовательского приложения повторяет паттерн OMP 4.13.1+ (subprocess и checker в `%files`).

**Референс:**

- [`packages/webview_flutter/example/aurora/rpm/ru.auroraos.webview_flutter_example.spec`](../../examples_external/flutter/webview-flutter/packages/webview_flutter/example/aurora/rpm/ru.auroraos.webview_flutter_example.spec)
- `packages/webview_flutter_aurora/README.md` §Configuration

**Целевые файлы Aurobore:**

- [`runtime/container/rpm/ru.auroraos.aurobore-container.spec`](../../runtime/container/rpm/ru.auroraos.aurobore-container.spec) — эталон для шаблона
- [`runtime/container/CMakeLists.txt`](../../runtime/container/CMakeLists.txt) — `WEBVIEW_SUBPROCESS_LAUNCHER_INSTALL_PATH`, `CEF_LINK_PROPERTY` (если потребуется)
- `@aurobore/build` — генератор `.spec`/CMake при M4 ([ADR-007](../adr/ADR-007-packaging-build.md))

**Шаги:**

1. Добавить `%global webview_launcher` и `%global cryptopro_checker` в шаблон `.spec`.
2. В `%install`: перенос `*.webview-subprocess` и `ru.auroraos.webview-cryptopro-checker` в `%{_libexecdir}/%{name}/`.
3. Проброс `-DWEBVIEW_SUBPROCESS_LAUNCHER_INSTALL_PATH=...` в `%cmake`.
4. Верификация: `rpm -ql <pkg>` содержит оба бинарника; приложение стартует на эмуляторе.

**Критерий готовности:** `pnpm container:all` (или `aurobore build` на M4) без ручного LD_LIBRARY_PATH; journal без ошибок CEF subprocess.

**Связь:** [mvp-plan.md](../mvp-plan.md) M4, [verification-status.md](../aurora/verification-status.md) V-2/V-3.

---

## W3 — Spike InitQCA / QtCrypto (приоритет: средний) ✅

**Цель:** понять, нужен ли Aurobore вызов QCA до `InitBrowser` для TLS/cookies на корпоративных сертификатах.

**Итог (V-webview-qca):** для **bundled SPA** QCA не обязателен (loopback trust через SPKI). Для **public external HTTPS** на SDK 5.2.1 — без изменений vs baseline. **QCA включён** в runtime и M4-шаблон для **parity с OMP** + потенциальные GOST-сценарии (GOST на spike не проверялся). См. [verification-status.md](../aurora/verification-status.md) V-webview-qca.

**Референс:**

```cpp
void WebviewFlutterAuroraPluginInitQCA() {
  static QCA::Initializer qcaInitializer;
}
```

Файл: `packages/webview_flutter_aurora/aurora/webview_flutter_aurora_plugin.cpp`.

**Целевые файлы:** [`runtime/container/src/main.cpp`](../../runtime/container/src/main.cpp), при необходимости `CMakeLists.txt` / `.spec` (`BuildRequires: pkgconfig(qca-qt5)` или аналог).

**Шаги:**

1. Spike: добавить `QCA::Initializer` до `InitBrowser`, пересобрать, проверить loopback HTTPS и внешний HTTPS (whitelist).
2. Если без изменений — задокументировать «не требуется для bundled SPA» в [webview.md](../aurora/webview.md).
3. Если требуется — зафиксировать в шаблоне M4.

**Критерий:** решение yes/no в verification-status (V-webview-qca) + journal без SSL errors на тестовом URL.

**Проверка:** `pnpm container:build` → `pnpm container:run`.

---

## W4 — HTTP Basic Auth и HTTP/resource errors (приоритет: средний) ✅

**Цель:** приложения с whitelist external URL могут пройти Basic Auth и получать события об ошибках загрузки.

**Референс:**

- [`http_auth_handler.cpp`](../../examples_external/flutter/webview-flutter/packages/webview_flutter_aurora/aurora/http_auth_handler.cpp) — `AW::HandlerManager::GetInstance()->getAuthHandler()`, сигнал `httpAuthRequested`
- CHANGELOG: `onHttpAuthRequest`, `onHttpError`, `onWebResourceError`
- C++ observer API в [`webview_controller.cpp`](../../examples_external/flutter/webview-flutter/packages/webview_flutter_aurora/aurora/webview_controller.cpp)

**Целевые файлы:**

- [`runtime/container/qml/pages/WebAppPage.qml`](../../runtime/container/qml/pages/WebAppPage.qml) — QML-сигналы WebView (если доступны в `plugins.qmltypes`)
- Native bridge helper (новый `.cpp` или расширение container) + событие bridge `webview:httpAuth` / `webview:loadError`
- Опционально: demo page в `html/` для intranet auth

**Шаги:**

1. Сверить доступные QML properties/signals `ru.auroraos.WebView` на SDK 5.2.x с C++ API Flutter (`AW::` namespace).
2. Минимальный UI: Silica dialog для login/password → callback в WebView.
3. Прокинуть HTTP 4xx/5xx как `bridgeRouter.emitEvent("webview:httpError", …)` для whitelist URL.

**Критерий:** тестовый URL с Basic Auth на эмуляторе/стенде; journal `W4 OK`.

**Не делаем:** кастомные SSL error dialogs (`onSslAuthError` unsupported).

**Проверка:** `pnpm container:all` + ручной тест auth URL.

---

## W5 — Cookie manager (приоритет: средний) ✅

**Цель:** session cookies на внешних origin (SSO, API) для гибридных приложений.

**Референс:** `AW::CookieManager::GetInstance()` — `setCookie` / `deleteCookies` в `webview_flutter_aurora_plugin.cpp`.

**Целевые файлы:**

- Native spike в container **или** расширение Network plugin (scope: только declared origins)
- JS API: опционально `@aurobore/core` helper / plugin manifest метод

**Шаги:**

1. Spike: setCookie/clearCookies из C++ на тестовом domain.
2. Решить: core runtime vs отдельный plugin `Cookies` (если понадобится публичный API).
3. Документировать ограничение: cookies не для loopback asset origin (same as Flutter).

**Критерий:** после setCookie запрос к whitelist domain отправляет cookie; clearCookies сбрасывает сессию.

---

## W6 — WebView dispose / пересоздание (приоритет: низкий) ✅

**Цель:** корректный teardown при dev reload или смене entry URL без zombie CEF-процессов.

**Референс:** [`WebviewController::Dispose`](../../examples_external/flutter/webview-flutter/packages/webview_flutter_aurora/aurora/webview_controller.cpp) — `DisconnectAll`, `deleteLater`, `DeferredDelete`; CHANGELOG fix после `Dispose()`.

**Реализовано:**

- `Loader` + `Component` в [`WebAppPage.qml`](../../runtime/container/qml/pages/WebAppPage.qml): `teardownWebView`, `recreateWebView`, lifecycle `destroy`.
- `aboutToQuit` в [`main.cpp`](../../runtime/container/src/main.cpp): `AssetSchemeServer::stop()`, `WebEngineContext::Shutdown()`.
- Harness: `AUROBORE_W6_DISPOSE=1` — 10 циклов после M3 OK; journal `W6 OK: 10 dispose cycles complete`.

**Критерий:** 10 циклов reload без роста процессов `webview-subprocess` в `ps` на эмуляторе. См. [webview.md](../aurora/webview.md) §6.4.

---

## W7 — Реестр verification-status (приоритет: низкий) ✅

**Цель:** зафиксировать открытые пункты WebView post-M1 в [verification-status.md](../aurora/verification-status.md).

Строки §2 (актуальный статус):

| # | Вопрос | Статус |
|---|---|---|
| V-webview-subprocess | Bundling `webview-subprocess` + `cryptopro-checker` в app RPM (W2) | 🟡 |
| V-webview-qca | Нужен ли `QCA::Initializer` для prod TLS (W3) | 🟢 |
| V-webview-auth | HTTP Basic Auth для whitelist URL (W4) | 🟢 |
| V-webview-cookies | Programmatic cookie API (W5) | 🟡 |
| V-webview-dispose | WebView dispose/recreate без zombie subprocess (W6) | 🟡 |

---

## Native-исходники webview_flutter_aurora (после sync)

Каталог: `examples_external/flutter/webview-flutter/packages/webview_flutter_aurora/aurora/`

| Файл | Назначение |
|---|---|
| `webview_flutter_aurora_plugin.cpp` | InitQCA, StartProcess, cookies, MethodChannel mapping |
| `webview_controller.cpp` / `.h` | WebView lifecycle, navigation, JS channels |
| `http_auth_handler.cpp` / `.h` | HTTP auth observer |
| `preference_manager.cpp` | preferences / browsing data |
| `command_line.cpp` | CEF subprocess command line |
| `egl_context_delegate.cpp` | Flutter texture / EGL (не для Aurobore QML) |
| `subprocess/main.cpp` | webview-subprocess entry |
| `include/webview_flutter_aurora/webview_flutter_aurora_plugin.h` | публичный C API плагина |

---

## Порядок работ

```
W1 (infra) ✅ → W2 (M4 packaging) ✅ → W3 (QCA spike) ✅ → W4 (auth/errors) ✅ → W5 (cookies) ✅ → W6 (dispose) ✅ → W7 (registry) ✅
```

W2 блокирует prod-ready `aurobore build`; W3–W5 — по запросу гибридных приложений с external URL.

## См. также

- [examples_external/README.md](../../examples_external/README.md)
- [native-plugin-guide.md](native-plugin-guide.md) §Flutter-референс
- [runtime/container/README.md](../../runtime/container/README.md)
- [aurora/webview.md](../aurora/webview.md)
- [alpha-plugins-plan.md](../alpha-plugins-plan.md) — параллельный план A3-плагинов
