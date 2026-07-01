# План этапа Alpha



> Детализация этапа 3 ([roadmap.md](roadmap.md)) — расширение возможностей поверх завершённого MVP.

> Критерии приёмки — SHOULD-требования в [requirements.md](requirements.md) §2. Принцип: каждую гипотезу проверяем на

> **реальном Aurora SDK**, а не на предположениях. Базовый путь create→dev→build→run — из [mvp-plan.md](mvp-plan.md).



## Порядок майлстоунов



```

A1 Bridge+ ─► A2 Runtime+ ─► A3 Plugins+ ─► A4 CLI+ ─► A5 SDK+ ─► A6 Compat/Demos

  backpressure   deep links    Camera/Geo/    HMR +         React/Vue/    матрица версий

  binary refs    insets/chrome Notif/Share/   plugin        Svelte        + демо-приложения

                 scopes        Sensors        create

```



---



## A1 — Bridge+ (стримы, бинарные данные) ⚑ первый шаг



**Цель:** довести мост до сценариев высокочастотных стримов и тяжёлых полезных нагрузок (камера, сенсоры).



FR-B7, FR-B8. См. [architecture/bridge.md](architecture/bridge.md) §6–§7, [architecture/event-system.md](architecture/event-system.md).



- [x] **Backpressure и батчинг** для стримов: прореживание/буферизация высокочастотных источников

      (сенсоры, геолокация), чтобы не перегружать JS-поток (FR-B8, NFR-1).

- [x] **Передача бинарных данных** без base64 в JSON: ссылки на ресурсы через Asset Loader / безопасный URL

      (фото камеры, файлы); опционально blob/ArrayBuffer-канал, если движок позволяет (FR-B7).

- [x] Контракт `stream` в протоколе: фазы `data`/`complete`/`error`, отмена подписки останавливает native-источник.

- [x] Loopback-тесты на backpressure и resource-ref в `packages/bridge-js`; обновление conformance-stub Echo.



**Выход A1:** Geolocation/Sensors/Camera могут опираться на стримы и resource URL без деградации UI.



---



## A2 — Runtime+ (deep links, scopes, system chrome)



**Цель:** маршрутизация извне, гранулярные разрешения на мосту и **zero-config** корректная вёрстка под

системный chrome Аврора (status bar, safe area, клавиатура) — без ручного `env()` и без отдельного

Cordova-плагина.



FR-R8, FR-R9, **FR-R11**. См. [architecture/runtime.md](architecture/runtime.md) §8–§9,

[architecture/configuration.md](architecture/configuration.md).



### Deep links и scopes



- [x] **Deep links:** `deepLinks.schemes` в `aurobore.config` → проекция в `.desktop`; при старте и при resume

      доставка URI в JS как событие `appurlopen` / `deeplink`.

- [x] **Scopes:** области в манифесте плагина (например, FS — только `appData`); проверка scope на мосту

      до вызова native-метода; понятные коды ошибок при отказе.

- [x] Документация и пример обработки deep link в веб-роутере приложения.

- [x] **V-14:** аппаратная «назад» — `Qt.Key_Back` → SPA history / `backbutton`; жест Silica на root page = minimize (OS). BackNavigation QML недоступен на 5.2.1.200.

### Системные insets и chrome (zero-config)

> **Проблема Cordova/Capacitor:** даже после появления `env(safe-area-inset-*)` и инъекции
> `--safe-area-inset-*` разработчик обязан сам прописать padding в CSS; большинство этого не делает.
> На Aurora status bar — **нативный chrome ОС**, CEF часто не заполняет `env()` корректно. Решение —
> ответственность **runtime по умолчанию**, а не документация «добавьте padding-top».

**Принцип:** приложение из `aurobore create` (vanilla/minimal) **сразу** корректно ложится под
status bar на эмуляторе/устройстве; разработчик пишет обычный CSS, как для десктопа.

- [x] **Native → web insets:** QML/runtime читает фактические отступы окна (status bar, display cutout,
      панель клавиатуры) и **до первой отрисовки** передаёт в WebView: инъекция CSS-переменных
      `--aurobore-safe-area-{top,right,bottom,left}` (и алиасы `--safe-area-inset-*` для совместимости
      с экосистемой) + обновление при rotation / resize / keyboard.
- [x] **Встроенный chrome-слой (ключевое отличие от «только vars»):** runtime **автоматически** подключает
      `aurobore-chrome.css` вместе с bridge-bootstrap — базовый reset: `box-sizing`, padding на `html` из
      переменных insets, без требований к `app.css` проекта. Шаблоны **не** дублируют safe-area логику.
- [x] **`viewport-fit=cover`:** выставляется контейнером (meta в шаблоне + runtime-нормализация, если entry
      подменён dev-сервером), чтобы `env()` и native insets согласованы.
- [x] **Fullscreen WebView:** контейнер рендерит WebView на 100% экрана (фикс. `screenAxisHeight()`, не `anchors.fill`); отступы под status bar / cutout / клавиатуру — только через CSS vars + `aurobore-chrome.css` (без конфига).
- [x] **Edge-to-edge opt-in, не обязанность:** для фиксированных header/toolbar — утилиты
      `.aurobore-edge-to-edge` / `env()` в `@aurobore/core` CSS; документация — один короткий раздел
      «immersive UI», не основной путь.
- [x] **Событие `systemChrome:insetsChanged`** (payload: insets в px) — для кастомных fixed-элементов;
      не требуется для типичного приложения.
- [x] **V-16:** верификация на Aurora SDK (эмулятор): vanilla без safe-area CSS не перекрывается status bar; rotation (все ориентации); клавиатура **overlay** (`KeyboardInput` on, фикс. высота WebView, `Qt.inputMethod` → inset); `innerHeight` стабилен (`overlaysContent`). Полная проверка на физическом устройстве — по возможности (Alpha).

### Обложка (cover API, opt-in)

- [x] **Формальная обложка по умолчанию:** `DefaultCover.qml` + `app.name`; без обязательного JS/конфига.
- [x] **Runtime API:** встроенный плагин `Cover` — `setState`, `setActions`, `reset`; события `cover:action`, `cover:active`, `cover:inactive`.
- [x] **Конфиг `cover.actions`:** декларативные кнопки (до 4) → `defaults.json` → `CoverBridge`.
- [x] **Документация:** [api/cover.md](api/cover.md), [tutorials/cover.md](tutorials/cover.md).
- [ ] **V-cover:** ручная проверка tap на обложке с `?coverDemo=1` на эмуляторе.



**Выход A2:** deep links и scopes работают; **vanilla из коробки** без знания CSS env — корректные

отступы под системный chrome; power-users сбрасывают padding в своём CSS при необходимости immersive UI.



---



## A3 — Plugins+ (расширенный набор)



**Цель:** пять стандартных плагинов расширения с полным циклом **каркаса**: манифест (SoT) → native-stub → codegen → docs.

На этапе A3 каждый плагин делаем **минимально**, как [Camera](plugins/camera.md): зарегистрированный контракт API,

типизированный SDK (`@aurobore/<plugin>`), native-методы возвращают `*_UNAVAILABLE` (или эквивалентный stub).

Реальный UI / системные API (камера, галерея, GPS, уведомления, шаринг, сенсоры) — **после** каркаса, отдельными итерациями.



FR-P6. См. [plugins/standard-plugins.md](plugins/standard-plugins.md) §3, [dev/adding-a-plugin.md](dev/adding-a-plugin.md).



- [x] **Camera** (каркас) — манифест `getPhoto` / `pickPhoto`, тип `Photo` (URL ресурса), permission `Camera`; stub → `CAMERA_UNAVAILABLE`.

- [x] **Geolocation** (каркас) — `getCurrentPosition`, стрим `watch` / `clearWatch`; permission `Location`; stub → `GEOLOCATION_UNAVAILABLE`.

- [x] **Notifications (local)** (каркас) — создать/отменить/расписание, событие нажатия; permissions по модели Аврора; stub.

- [x] **Share** (каркас) — `shareText` / `shareFile` / `shareUrl`; stub → `SHARE_UNAVAILABLE`.

- [x] **Sensors** (каркас) — акселерометр/гироскоп как стримы (контракт + `cancel`); stub → `SENSORS_UNAVAILABLE` (зависит от A1 для стримов).

- [x] На каждый плагин (чеклист каркаса): `plugin.manifest`, `plugins/<name>/native/*Plugin.{h,cpp}` с factory,

      `"<name>"` в `PLUGIN_NAMES`, CMake, `@aurobore/<name>`, `docs/plugins/<name>.md`, коды `*_UNAVAILABLE` / `*_CANCELLED` в манифесте.

- [x] Сборка контейнера: `pnpm container:build` — все плагины A3 компилируются; journal: `registered <Name>`.



**Выход A3:** расширенный набор плагинов доступен через `plugin add` и типизированный SDK (контракт + stub).

Полноценная работа на устройстве/эмуляторе — критерий **post-A3** (отдельные задачи на UI и нативные API).



---



## A4 — CLI+ (Hot Reload, plugin create)



**Цель:** ускорить итерацию веба и снизить порог создания нового плагина.



FR-C7, FR-C8. См. [architecture/dev-server.md](architecture/dev-server.md), [architecture/cli.md](architecture/cli.md).



- [x] **Hot Reload (HMR)** в `aurobore dev`: интеграция с HMR веб-сборщика (Vite и аналоги), без блокировки

      HMR-канала dev-контейнером; откат к live reload при неподдерживаемой замене модуля.

- [x] **`aurobore plugin create <name>`** — скелет плагина (манифест, native stub, package.json, README)

      по шаблону из [dev/native-plugin-guide.md](dev/native-plugin-guide.md).

- [x] Диагностика типичных проблем dev-режима (хост недоступен с эмулятора, порт, файрвол).



**Выход A4:** разработчик меняет веб без потери состояния; новый плагин создаётся одной командой.



---



## A5 — SDK+ (шаблоны фреймворков, туториалы)



**Цель:** официальные точки входа для популярных фреймворков и app-facing гайд по плагинам.



FR-S4. См. [architecture/typescript-sdk.md](architecture/typescript-sdk.md), [tutorials/README.md](tutorials/README.md).



- [x] Шаблоны **`react`**, **`vue`**, **`svelte`** в `templates/` (Vite, `aurobore.config`, пример плагина).

- [x] `aurobore create --template react|vue|svelte` подключает шаблон.

- [x] Туториал: [шаблоны React/Vue/Svelte](tutorials/framework-templates.md) (рабочий пример в `examples/`).

- [x] Туториал: [написание своего плагина](tutorials/writing-a-plugin.md) (app-facing, поверх `plugin create`).



**Выход A5:** новый проект можно начать с выбранного фреймворка без ручной интеграции с Aurobore.



---



## A6 — Совместимость и демо-приложения ✅



**Цель:** подтвердить работу на линейке Chromium/CEF и нескольких версиях ОС Аврора.



FR-R7, NFR-3. См. [adr/ADR-004-webview-engine-abstraction.md](adr/ADR-004-webview-engine-abstraction.md).



- [x] **Матрица совместимости** в документации: минимальная версия ОС (`build.minOs`), проверенные SDK

      (5.1.5/5.1.6+, 5.2.x); Gecko вне области поддержки. → [aurora/compatibility-matrix.md](aurora/compatibility-matrix.md).

- [x] Прогон ключевых сценариев на **двух** целевых версиях SDK (например 5.1.x и 5.2.1.200).

      Verified: 5.2.1.200 (`pnpm compat:verify`); 5.1.x — declared, pending SDK.

- [x] **2+ демо-приложения** (например `camera-demo`, `geo-demo` или расширение `hello-world`), использующих

      плагины A3; воспроизводимый путь create→build→run. → [examples/camera-demo](../examples/camera-demo/), [examples/geo-demo](../examples/geo-demo/).

- [x] Закрыть или зафиксировать статус **V-5** (мин. версия ОС) и **V-7** (бенчмарк моста на устройстве).

      → [aurora/verification-status.md](aurora/verification-status.md) §2.



**Выход A6:** реальные демо работают на нескольких версиях Аврора — критерий выхода Alpha из roadmap.

**Sign-off A6 (2026-07-01):** `pnpm compat:verify -- --with-demos` на `AuroraOS-5.2.1.200-x86_64` — 7/7 examples (web + RPM), `container:all` journal M1/M2/M3 OK. 5.1.x — declared, pending SDK.



---



## Критерий выхода Alpha



Выполнены FR-R8, FR-R9, **FR-R11**, FR-B7, FR-B8, FR-P6, FR-C7, FR-C8, FR-S4 и NFR-3

(см. [requirements.md](requirements.md) §2). Прогон соответствующих пунктов

[checklists.md](checklists.md) §4–§8 (deep links, HMR, адаптеры фреймворков, матрица версий).

**Реальные демо-приложения работают на нескольких версиях Аврора** ([roadmap.md](roadmap.md) §3).



**Sign-off:** _ожидается_ — A1…A5 и **A6** закрыты (2026-07-01); остаётся V-cover (A2) и прогон на 5.1.x SDK при установке таргета.

Этап Beta — см. [roadmap.md](roadmap.md).



## Вне области Alpha (следующие этапы)



| Требование | Этап |
|---|---|
| FR-B9 — бинарный/компактный протокол моста | Post-1.0 (COULD) |
| FR-P7 — сторонние плагины из npm | Beta |
| FR-D3 — DevTools (лог моста, профилирование) | Beta |
| FR-T1 — conformance-suite | Beta |
| FR-D4 — автоген справочника API в сайт доков | Beta |



## Открытые верификации, закрываемые по ходу Alpha



Из [aurora/verification-status.md](aurora/verification-status.md):



| ID | Содержание | Майлстоун | Статус |
|---|---|---|---|
| V-5 | Минимальная версия ОС Аврора | A6 | 🟢 зафиксировано (`minOs: 5.1.5`); verified 5.2.1.200 |
| V-7 | Пропускная способность/латентность моста на устройстве | A6 | 🟢 JSON достаточен для Alpha; bench — manual в hello-world |



## Окружение



Как в MVP: Node 20 LTS + pnpm, Aurora SDK (mb2) + эмулятор + сертификаты подписи;

на Windows — Git Bash + режим разработчика. См. [README](../README.md#требования-к-окружению-разработчика).

Для Alpha желательно доступ к **физическому устройству** (Camera, Sensors, Notifications, V-7/V-14/V-16).

Нативная проверка: `pnpm container:all` или `aurobore build` / `aurobore run` (см. [tools/aurora/README.md](../tools/aurora/README.md)).
