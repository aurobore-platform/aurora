# Реестр допущений и статус верификации (факты об ОС Аврора)

> Что из допущений об ОС Аврора **подтверждено** официальной документацией, что — **по сообществу**,
> а что **остаётся открытым** и требует проверки на установленном Aurora SDK/устройстве.
> Ведётся вместе с [sources.md](sources.md); связан с ADR-002/004/007 и `requirements.md` (§5, A1–A5).
> Легенда: ✅ подтверждено официально · 🟢 подтверждено практикой/демо · 🟡 частично · ⚠️ расхождение · ⏳ открыто.

## 1. Подтверждённые факты (допущение можно снять)

| # | Факт | Статус | Источник |
|---|---|---|---|
| C-1 | Целевой движок WebView — **Chromium на базе CEF**; есть и Webview (Gecko) | ✅ | web_and_content; webview_chromium |
| C-2 | Доступность: **Webview (Chromium) ≥ 5.1.3**, **Webview (Gecko) ≥ 4.0.2** | ✅ | таблица версий API |
| C-3 | Сборочный `pkgconfig` — **`aurorawebview`** (`PKGCONFIG += aurorawebview`) | ✅ | webview_chromium |
| C-4 | QML-модуль — **`ru.auroraos.WebView 1.0`** | ✅ | webview_chromium |
| C-5 | C++ API — **`Aurora::WebView::WebEngineContext` / `WebViewItem`** (StartProcess/InitBrowser) | ✅ | webview_chromium |
| C-6 | Зависимость **`libcef`** присутствует (CEF-движок) | 🟢 | демо WebViewBrowser; практика |
| C-7 | Мост CEF — **`CefMessageRouter` / `window.cefQuery`** (request/response, `persistent`) | 🟢 | апстрим CEF; CEF-основа Авроры |
| C-8 | Сборка — **mb2** (Build Engine) / **apptool** (BT); упаковка — **RPM**, подпись обязательна | ✅ | app_development; psdk/build |
| C-9 | Изоляция — **Firejail**; разрешения декларируются в **`.desktop`**; D-Bus от `OrganizationName`/`ApplicationName` | ✅ | sandbox |
| C-10 | Архитектуры таргетов — `x86_64`/`armv7hl`/`aarch64`; имя `AuroraOS-<rel>-base-<arch>` | ✅ | psdk/build; app_development |
| C-11 | WebView API даёт **async messages (web↔native)** и **`runJavaScript`** (основа нашего моста) | 🟢 | демо [WebViewAPI](https://hub.mos.ru/auroraos/demos/WebViewAPI) (с 5.1.3) |
| C-13 | **Точные сигнатуры моста** Chromium-WebView: QML `sendAsyncMessage(name,data)` / `addMessageListener(name)` / сигнал `onRecvAsyncMessage(name,data)` / `runJavaScript(code,ok,err)`; JS-сторона — глобальная `sendAsyncMessage(name,data)` | 🟢 | исходники демо WebViewAPI (`qml/pages/AsyncMessages.qml`, `html/AsyncMessages.html`, `src/main.cpp`) |
| C-12 | Штатный инструментарий: `mb2`/`apptool`/`sb2`, `ADT`, `GDB`, `rpm-validator`, `rpmsign-external`, `Svace`, `Valgrind`, `testrunner-lite` | ✅ | [tools](https://developer.auroraos.ru/doc/sdk/tools) |

**Действие:** соответствующие пометки `(verify)` в [ADR-004](../adr/ADR-004-webview-engine-abstraction.md),
[ADR-007](../adr/ADR-007-packaging-build.md) и `requirements.md` (A2) можно понизить до «подтверждено,
ссылка на этот реестр», оставив открытыми только пункты раздела §2.

## 2. Открытые вопросы (требуют проверки на SDK/устройстве)

| # | Вопрос | Статус | Риск | Как проверить |
|---|---|---|---|---|
| V-1 | ✅ **Закрыт на SDK.** Сигнатуры подтверждены `plugins.qmltypes` модуля `ru.auroraos.WebView` (тип `WebViewItem`) на 5.2.1.200: сигнал `recvAsyncMessage(name,data:QVariant)`, методы `sendAsyncMessage(name,data)`, `addMessageListener(name)`, `runJavaScript(script,cb,errCb)`, `loadHtml(html)`. | ✅ | — | PoC `runtime/poc-bridge` на SDK 5.2.1.200 |
| V-2 | ✅ **Закрыт на SDK.** Рантайм-RPM — **`ru.auroraos.webview`** (на эмуляторе установлен `ru.auroraos.webview-1.239.2`); devel — **`ru.auroraos.webview-devel`** (`pkgconfig(aurorawebview)` 1.239.2). Вариант `ru.aurora.webview` неверен. | ✅ | — | `rpm -qa | grep webview`, `rpm -ql ru.auroraos.webview` |
| V-3 | ✅ **Закрыт на SDK.** `libcef.so` лежит в **`/usr/lib/cef/`**; плагин WebView не имеет RPATH. Без `LD_LIBRARY_PATH=/usr/lib/cef` (или RPATH `$ORIGIN/../lib/cef`) плагин не грузится: `libcef.so: cannot open shared object file`. Генератор контейнера обязан это учитывать. | ✅ | — | Запуск PoC на эмуляторе; `find / -name libcef.so*` → `/usr/lib/cef` |
| V-4 | ✅ **Закрыт на SDK (PoC).** На 5.2.x CEF инициализируется C++-вызовом **`Aurora::WebView::WebEngineContext::InitBrowser(argc, argv, additionalArgs)`** после `createView()`, до загрузки QML с `WebViewItem`. Без него — `must call setWebviewParams() before initBrowser()`. Публичные `StartProcess`/`setWebviewParams` в 5.2.x заменены `InitBrowser` (`webenginecontext.h`). | ✅ | — | PoC `runtime/poc-bridge/src/main.cpp`; devel `aurorawebview` |
| V-5 | Минимальная целевая версия ОС для устройств заказчика (Chromium-линейка) | ⏳ | Низкий/планирование | Согласовать с целевыми устройствами; матрица в CI |
| V-6 | 🟡 **Частично.** PoC ставит `.desktop` с `Permissions=Internet` (`[X-Application]`), приложение стартует без отказа sandbox. Полный синтаксис/список общих директорий 5.2.x — подтвердить по справочнику. | 🟡 | Средний (permissions) | Справочник «Установочные пакеты»/«.desktop»; PoC |
| V-7 | Пропускная способность/латентность моста на реальном устройстве (нужен ли бинарный протокол, FR-B9) | ⏳ | Низкий (post-MVP) | Бенчмарк на устройстве |
| V-8 | ✅ **Закрыт (PoC).** C++-devel **`ru.auroraos.webview-devel`** доступен в онлайн-репозитории OMP; после `sfdk tools target package-install ru.auroraos.webview-devel` и пересоздания snapshot — `pkgconfig(aurorawebview)` и `webenginecontext.h` в таргете. Сборка PoC с линковкой `PkgConfig::AuroraWebView` и `InitBrowser()` успешна. | ✅ | — | `sfdk tools target package-install`; snapshot `.default` |
| V-12 | ✅ **Закрыт (M1).** `InitBrowser()` после `createView()`, до `setSource()` с `ApplicationWindow` + `pageStack` + `cover` — приложение стартует на SDK 5.2.1.200. | ✅ | — | `runtime/container`; `pnpm container:all` |
| V-13 | 🟢 **M1+.** Прямой `CefRegisterSchemeHandlerFactory` недоступен в public SDK. Реализован **loopback `AssetSchemeServer`** (`https://127.0.0.1:<port>/`, auto-trust SPKI в `InitBrowser`) с маппингом через `AssetResolver`; path-based SPA, secure context. HTTP fallback при отсутствии Qt SSL. | 🟢 | Средний (FR-R6) | `src/AssetSchemeServer.*`, `LoopbackTlsCredentials`, `tls/` |
| V-14 | 🟢 **Закрыт (A2).** `Qt.Key_Back` на `Page` + `ApplicationWindow` → `handleBackNavigation()` → SPA `history.back()` или `backbutton`. Симуляция в демо: `sendAsyncMessage("aurobore:back")`. Жест Silica «назад» на root page сворачивает приложение (OS UX). `BackNavigation` QML недоступен на 5.2.1.200. | 🟢 | Средний (UX) | `pnpm container:all`; journal `A2 back OK` |
| V-15 | 🟢 **Закрыт (шаблон OMP).** Иконки: `icons/{86,108,128,172}x{86,108,128,172}/<appId>.png`; CMake `install(... DESTINATION share/icons/hicolor/<size>/apps)`; spec `%{_datadir}/icons/hicolor/*/apps/%{name}.png`; `.desktop` `Icon=<appId>`. Источник: ApplicationTemplate, TFLiteSample. Aurobore генерирует те же пути в `.aurobore/native/`. | 🟢 | Низкий (store UI) | `aurobore build`; `rpm -ql` на пакет; лаунчер эмулятора |
| V-16 | 🟢 **Закрыт (A2, эмулятор).** Native→CSS vars (`Theme.statusBarHeight`, `SafeZoneRect`), `overlayWebView`, `aurobore-chrome.css`, runtime viewport normalize, `systemChrome:insetsChanged`. Keyboard bottom inset: `virtualKeyboardMargin` (Gecko) или **visualViewport** fallback (Chromium 5.2.x). Journal: `A2 chrome OK`, `A2 OK`. Физическое устройство — рекомендуется для финального sign-off. | 🟢 | Средний (UX) | `pnpm container:all` |

## 3. Влияние на завершение этапа Design

- §1 (C-1…C-13) — допущения **сняты**: достаточно для проектных решений. Механизм моста (async messages
  + `runJavaScript`) подтверждён и демо, и системой типов реального SDK (V-1).
- §2 — по итогам **M0-спайка на реальном SDK 5.2.1.200** закрыты V-1/V-2/V-3/V-4/V-8 (мост, RPM, libcef,
  CEF init, devel-пакет); частично V-6 (`.desktop` + `Permissions=Internet`). **M1** закрыл V-12;
  частично V-13/V-14 (asset loader, аппаратная «назад»).

> Вывод этапа Design сохраняется: ключевой архитектурный риск (модель моста) снят. **M0 на эмуляторе**
> подтвердил полный круг web↔native и упаковочные факты; для CEF на 5.2.x обязателен `InitBrowser()`
> из `aurorawebview-devel` (V-4, V-8).

## 4. Подтверждено практикой в M0 (PoC `runtime/poc-bridge` на эмуляторе 5.2.1.200)

| Что | Результат |
|---|---|
| Сборка контейнера штатным SDK (CMake → RPM) | ✅ `sfdk -c target=AuroraOS-5.2.1.200-x86_64 build` |
| Установка/запуск на эмуляторе | ✅ (подпись на dev-VM обходится `--define '__transaction_validation %{nil}'`) |
| Загрузка QML + модуля `ru.auroraos.WebView`, создание `WebViewItem` | ✅ |
| Имя рантайм-RPM (V-2) | ✅ `ru.auroraos.webview` |
| Путь `libcef` и loader-path (V-3) | ✅ `/usr/lib/cef`, нужен `LD_LIBRARY_PATH`/RPATH |
| CEF init через `InitBrowser()` (V-4) | ✅ `aurorawebview-devel` + вызов в `main.cpp` |
| Полный круг web↔native (эхо + ack) | ✅ journal: `[poc-native] PoC OK: round-trip подтверждён` |

## 5. Подтверждено практикой в M1 (контейнер `runtime/container` на эмуляторе 5.2.1.200)

| Что | Результат |
|---|---|
| `ApplicationWindow` + Silica `pageStack`/`cover` + `InitBrowser` (V-12) | ✅ |
| Entry через loopback HTTPS + логический `aurobore-app://` (V-13) | 🟢 loopback TLS origin, secure context, auto-trust |
| Splash + `aurobore:ready` / таймаут-fallback | ✅ |
| Lifecycle `ready`/`pause`/`resume` в JS (`Aurobore._emit`) | ✅ |
| Demo SPA (History API) + симуляция «назад» (V-14) | 🟡 |
| `CMAKE_INSTALL_RPATH` → `$ORIGIN/../lib/cef` + dev `LD_LIBRARY_PATH` | ✅ |
| Полный цикл dev-toolkit | ✅ journal: `[aurobore-container] M1 OK: aurobore-app loaded, lifecycle ready, SPA back works` |
