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
| V-5 | Минимальная целевая версия ОС для устройств заказчика (Chromium-линейка) | 🟢 | Низкий/планирование | `minOs: 5.1.5` в конфиге/defaults; CEF с 5.1.3+ (C-2). A6 verified на 5.2.1.200 (2026-07-01); 5.1.x — pending SDK; см. [compatibility-matrix.md](compatibility-matrix.md) |
| V-6 | 🟡 **Частично.** PoC ставит `.desktop` с `Permissions=Internet` (`[X-Application]`), приложение стартует без отказа sandbox. Полный синтаксис/список общих директорий 5.2.x — подтвердить по справочнику. | 🟡 | Средний (permissions) | Справочник «Установочные пакеты»/«.desktop»; PoC |
| V-7 | Пропускная способность/латентность моста на реальном устройстве (нужен ли бинарный протокол, FR-B9) | 🟢 | Низкий (post-MVP) | Неформальный bench в `hello-world` (100× ping + stream); эмулятор 5.2.1.200 — см. [compatibility-matrix.md](compatibility-matrix.md). JSON-протокол достаточен для Alpha; физ. устройство — рекомендуется |
| V-8 | ✅ **Закрыт (PoC).** C++-devel **`ru.auroraos.webview-devel`** доступен в онлайн-репозитории OMP; после `sfdk tools target package-install ru.auroraos.webview-devel` и пересоздания snapshot — `pkgconfig(aurorawebview)` и `webenginecontext.h` в таргете. Сборка PoC с линковкой `PkgConfig::AuroraWebView` и `InitBrowser()` успешна. | ✅ | — | `sfdk tools target package-install`; snapshot `.default` |
| V-12 | ✅ **Закрыт (M1).** `InitBrowser()` после `createView()`, до `setSource()` с `ApplicationWindow` + `pageStack` + `cover` — приложение стартует на SDK 5.2.1.200. | ✅ | — | `runtime/container`; `pnpm container:all` |
| V-13 | 🟢 **M1+.** Прямой `CefRegisterSchemeHandlerFactory` недоступен в public SDK. Реализован **loopback `AssetSchemeServer`** (`https://127.0.0.1:<port>/`, auto-trust SPKI в `InitBrowser`) с маппингом через `AssetResolver`; path-based SPA, secure context. HTTP fallback при отсутствии Qt SSL. | 🟢 | Средний (FR-R6) | `src/AssetSchemeServer.*`, `LoopbackTlsCredentials`, `tls/` |
| V-14 | 🟢 **Закрыт (A2).** `Qt.Key_Back` на `Page` + `ApplicationWindow` → `handleBackNavigation()` → SPA `history.back()` или `backbutton`. Симуляция в демо: `sendAsyncMessage("aurobore:back")`. Жест Silica «назад» на root page сворачивает приложение (OS UX). `BackNavigation` QML недоступен на 5.2.1.200. | 🟢 | Средний (UX) | `pnpm container:all`; journal `A2 back OK` |
| V-15 | 🟢 **Закрыт (шаблон OMP).** Иконки: `icons/{86,108,128,172}x{86,108,128,172}/<appId>.png`; CMake `install(... DESTINATION share/icons/hicolor/<size>/apps)`; spec `%{_datadir}/icons/hicolor/*/apps/%{name}.png`; `.desktop` `Icon=<appId>`. Источник: ApplicationTemplate, TFLiteSample. Aurobore генерирует те же пути в `.aurobore/native/`. | 🟢 | Низкий (store UI) | `aurobore build`; `rpm -ql` на пакет; лаунчер эмулятора |
| V-16 | 🟢 **Закрыт (A2, эмулятор).** Fullscreen WebView (фикс. `screenAxisHeight()`, не `anchors.fill`), `ApplicationWindow` `FillScreen`, native→CSS vars (`Theme.statusBarHeight`, `SafeZoneRect`), `aurobore-chrome.css`, runtime viewport normalize, `systemChrome:insetsChanged`. Клавиатура overlay: `KeyboardInput` **on**, bottom inset из **`Qt.inputMethod`** (+ `overlaysContent` / `visualViewport` fallback); WebView не сжимается при открытии IME. Journal: `A2 chrome OK`, `A2 keyboard OK`, `A2 OK`. Физическое устройство — рекомендуется для финального sign-off. | 🟢 | Средний (UX) | `pnpm container:all` |
| V-cover | 🟡 **Реализовано (A2).** Формальная обложка по умолчанию; opt-in `Cover` API + `cover.actions`; демо `?coverDemo=1`. Ручная проверка tap на обложке на эмуляторе — pending. | 🟡 | Низкий (UX) | `pnpm container:all`; `?coverDemo=1` |
| V-camera | 🟡 **Реализовано (P1).** `pickPhoto` — `Sailfish.Pickers` `ImagePickerPage` (`sailfish-components-pickers-qt5`); `getPhoto` — Qt5 `QtMultimedia` `Camera` + `imageCapture` (`qt5-qtmultimedia`). Файл копируется в app-data через `AuroboreResource::writeAppDataFile`; async invoke (deferred `QVariant` + `emitOutbound`). Эмулятор x86: `getPhoto` → `CAMERA_UNAVAILABLE` (нет камеры); `pickPhoto` — при наличии галереи в образе. Sign-off — физ. устройство. | 🟡 | Средний (Camera plugin) | `pnpm container:all`; `examples/camera-demo` на устройстве |
| V-geo | 🟡 **Реализовано (P2).** Qt5 `QGeoPositionInfoSource` / GeoClue (`qt5-qtpositioning`). `getCurrentPosition` — async `requestUpdate` + `maximumAge`/`timeout`; `watch` — `startUpdates` + `StreamPublisher` (backpressure). `watchId` в `clearWatch` === `subscriptionId` из `watch()`. Эмулятор x86 без mock GPS: `GEOLOCATION_UNAVAILABLE` (ожидаемо). `BRIDGE_PERMISSION_DENIED` без `Location` в granted permissions. Sign-off — физ. устройство с GPS. | 🟡 | Средний (Geolocation plugin) | `pnpm container:all`; `examples/geo-demo` на устройстве |
| V-sensors | 🟡 **Реализовано (P3).** Qt5 `QAccelerometer` / `QGyroscope` (`qt5-qtsensors`). `watchAccelerometer` / `watchGyroscope` — `start()` + `StreamPublisher` (backpressure через `streamMaxFps`). Акселерометр и гироскоп — независимые подписки; `sub.stop()` / `cancel(id)` останавливает native-сенсор. Эмулятор x86 без IMU: `SENSORS_UNAVAILABLE` (ожидаемо). Разрешений в манифесте нет. Sign-off — физ. устройство с IMU. | 🟡 | Средний (Sensors plugin) | `pnpm container:all`; `examples/sensors-demo` на устройстве |
| V-notif | 🟡 **Реализовано (P4).** Nemo `Notification` (`nemonotifications-qt5`) + session D-Bus `remoteAction` для tap из шторки. `notify` / `schedule` (in-process `QTimer`) / `cancel` / `cancelAll`. Событие `notification:tap` → `BridgeRouter::emitEvent`; очередь до `aurobore:ready`. `schedule` не переживает kill процесса. Sign-off — tap на физ. устройстве. | 🟡 | Средний (Notifications plugin) | `pnpm container:all`; `examples/notifications-demo` на эмуляторе/устройстве |
| V-share | 🟡 **Реализовано (P5).** `Sailfish.Share` `ShareAction` (`sailfish-components-share-qt5`, SFOS 4.2+). `shareText` / `shareUrl` — `resources` map (`text/plain`, `text/x-url`); `shareFile` — локальный путь из `aurobore-app://localhost/app-data/...` через `ScopeValidator::resolveAppDataPath`. Async invoke (deferred + `ShareBridge` + `ShareSheetPage.qml`). `SHARE_CANCELLED` — back/закрытие sheet-page без успешного `trigger()` или `cancel()`. Разрешений в манифесте нет. Sign-off — физ. устройство / эмулятор с transfer engine. | 🟡 | Средний (Share plugin) | `pnpm container:all`; `examples/share-demo` |
| V-webview-subprocess | 🟡 **Реализовано (W2).** RPM шаблон: `{appId}.webview-subprocess` + `ru.auroraos.webview-cryptopro-checker` в `%{_libexecdir}/%{name}/`; CMake subprocess target + `--browser-subprocess-path` в `InitBrowser`. Fallback: `pkgconfig(aurorawebview)` если нет `aurora_libaurorawebview` (SDK 5.2.1); cryptopro-checker копируется из build-env при отсутствии в buildroot. Sign-off — `pnpm container:all` + `rpm -ql` на эмуляторе. | 🟡 | Средний (prod packaging) | `pnpm container:all`; `rpm -ql \| grep webview-subprocess` |
| V-webview-qca | 🟢 **Закрыт (W3 spike, SDK 5.2.1.200).** `QCA::Initializer` + `qca2-qt5` в main до `InitBrowser` (parity с OMP Flutter). **Bundled SPA (loopback):** не зависит от QCA — trust через SPKI fingerprint (V-13). **Public external HTTPS** (`https://example.com`, whitelist): работает с QCA; baseline без QCA на том же SDK тоже работал — QCA **не обязателен** для bundled-only / публичного TLS. **GOST/CryptoPro:** не верифицировано на spike; для prod гибридов включён `cryptopro-checker` (W2) + QCA по референсу OMP. Journal: `InitQCA: QCA::Initializer ready`, `W3 external test OK: loaded https://example.com`. | 🟢 | Низкий (bundled SPA) / Средний (GOST) | `AUROBORE_W3_EXTERNAL=1 pnpm container:run`; `pnpm container:journal` |
| V-webview-auth | 🟢 **Закрыт (W4, SDK 5.2.1.200 эмулятор).** HTTP Basic Auth через публичный `AuthHandler::GetInstance` (`aurorawebview/authhandler.h`), native Silica dialog + bridge plugin `webview` (`respondAuth` / `cancelAuth`). HTTP 4xx/5xx → `webview:httpError`, resource errors → `webview:loadError`. Journal: `WebViewAuthBridge: AuthHandler connected`, `W4 auth test: navigating to …`, `W4 auth OK: loaded …`. CMake: `find_path(aurorawebview/httpauthrequest.h)` (не internal `handlermanager.h`). | 🟢 | Средний (гибридные apps) | `AUROBORE_W4_AUTH=1 pnpm container:run`; см. [webview.md](webview.md) §6.2 |
| V-webview-cookies | 🟡 **Реализовано (W5).** Public `CookieManager` (`aurorawebview/cookies/cookiemanager.h`): `clearCookies` native; `setCookie` — QML orchestration (`document.cookie` после navigate на whitelisted domain; SDK 5.2.1 без public `setCookie`, в отличие от OMP Flutter internal API). Bridge plugin `webview` (`setCookie` / `clearCookies`). Sign-off — `AUROBORE_W5_COOKIES=1` на эмуляторе. Journal: `W5 cookie test: setCookie OK`, `W5 cookie OK: Cookie header verified`, `W5 cookie OK: cleared`. | 🟡 | Средний (гибридные apps) | `AUROBORE_W5_COOKIES=1 pnpm container:run`; см. [webview.md](webview.md) §6.3 |
| V-webview-dispose | 🟡 **Реализовано (W6).** `Loader` + `teardownWebView` / `recreateWebView` в [`WebAppPage.qml`](../../runtime/container/qml/pages/WebAppPage.qml): stop timers, cancel pending auth/cookie, lifecycle `destroy`, clear `__auroboreBridgeReceive`, `about:blank`, destroy/recreate QML WebView. `aboutToQuit`: `AssetSchemeServer::stop()`, `WebEngineContext::Shutdown()`. Harness: `AUROBORE_W6_DISPOSE=1` — 10 циклов после M3 OK. Journal: `W6 dispose cycle N/10`, `W6 OK: 10 dispose cycles complete`. Sign-off — `ps \| grep webview-subprocess` без роста на эмуляторе. | 🟡 | Низкий (dev reload) | `AUROBORE_W6_DISPOSE=1 pnpm container:run`; см. [webview.md](webview.md) §6.4 |

## 3. Влияние на завершение этапа Design

- §1 (C-1…C-13) — допущения **сняты**: достаточно для проектных решений. Механизм моста (async messages
  + `runJavaScript`) подтверждён и демо, и системой типов реального SDK (V-1).
- §2 — по итогам **M0-спайка на реальном SDK 5.2.1.200** закрыты V-1/V-2/V-3/V-4/V-8 (мост, RPM, libcef,
  CEF init, devel-пакет); частично V-6 (`.desktop` + `Permissions=Internet`). **M1** закрыл V-12;
  частично V-13/V-14 (asset loader, аппаратная «назад»). **W2–W6 (WebView post-M1):** subprocess/cryptopro
  bundling (W2), QCA spike (W3), HTTP auth + load errors (W4), cookie API (W5), dispose/recreate + CEF
  shutdown (W6) — см. `V-webview-*` в §2 и [webview.md](webview.md) §6.

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
