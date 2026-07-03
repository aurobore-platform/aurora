# План доработки плагинов A3 (post-Alpha)



> Детализация задач **после** майлстоуна A3 в [alpha-plan.md](alpha-plan.md) — от каркаса (stub → `*_UNAVAILABLE`)

> до рабочих native-реализаций на Aurora SDK. Контракт API, манифесты и SDK уже зафиксированы; меняется только

> `plugins/<name>/native/*Plugin.cpp` и связанная верификация.



## Контекст



На этапе A3 закрыт **FR-P6** как «каркас»: манифест (SoT) → codegen → `@aurobore/<plugin>` → docs → stub в native.

Реальный UI и системные API Авроры сознательно отложены. Инфраструктура для реализации уже есть:



- **A1:** стримы, `cancel`, backpressure (`StreamPublisher`), `ResourceRef` / Asset Loader (FR-B7, FR-B8).

- **A2:** разрешения в `.desktop`, scopes на мосту (FR-R9).

- **Демо:** [`camera-demo`](../examples/camera-demo/), [`geo-demo`](../examples/geo-demo/), [`sensors-demo`](../examples/sensors-demo/) — round-trip со stub.



См. [plugins/standard-plugins.md](plugins/standard-plugins.md) §3, [dev/native-plugin-guide.md](dev/native-plugin-guide.md).



## Референс: Flutter community plugins



Перед реализацией native-части (P1…P5) проверьте, есть ли **аналогичный плагин** в каталоге

[Flutter Packages на Mos.Hub](https://hub.mos.ru/auroraos/flutter/flutter-community-plugins) (в Cursor — `@flutter-community-plugins`).

Если плагин там есть — **обязательно** изучите его исходники, прежде всего **platform implementation**

(C++/Qt, вызовы к ОС), а не Dart/UI-слой:



- какие системные API Авроры используются (камера, GPS, уведомления, share, сенсоры);

- какие **permissions** и sandbox-ограничения учтены;

- обработка отмены, отсутствия железа, async/callback.



Это **не** код для копипаста: у Aurobore другой контракт (`IPlugin` → `BridgeRouter`, манифест, `ResourceRef`,

стримы). Flutter-плагин — **карта интеграции с ОС**; перенос — в `plugins/<name>/native/*Plugin.cpp`

с верификацией на SDK (V-camera … V-share). Подробнее — [native-plugin-guide.md](dev/native-plugin-guide.md) §Flutter-референс.



## Порядок итераций



```

P1 Camera ──► P2 Geolocation ──► P3 Sensors

     │              │                  (стримы + backpressure, A1)

     │              └── Location permission, Qt Positioning

     └── ResourceRef (фото в app-data)

P4 Notifications ──► P5 Share

     │                    └── shareFile ← ResourceRef (зависит от P1)

     └── событие notification:tap, permission Notifications

```



Рекомендуемый порядок: **Camera → Geolocation → Sensors → Notifications → Share**.

Camera и Share разделяют паттерн ResourceRef; Geolocation и Sensors — паттерн стримов.



---



## P1 — Camera (съёмка и галерея)



**Цель:** `getPhoto` и `pickPhoto` возвращают реальный `Photo` (resource URL), а не `CAMERA_UNAVAILABLE`.



См. [plugins/camera.md](plugins/camera.md), [ResourceRef.h](../runtime/native-sdk/ResourceRef.h), FR-B7.



### Исследование (verify на SDK)



- [x] Зафиксировать рабочий стек на Aurora 5.2.1.200: `pickPhoto` — `Sailfish.Pickers` / `sailfish-components-pickers-qt5`; `getPhoto` — Qt5 `QtMultimedia` / `qt5-qtmultimedia`. 5.1.x — по документации, прогон pending.

- [ ] Проверить сценарии на **физическом устройстве**: съёмка с задней камеры, выбор из галереи, отмена пользователем. На эмуляторе x86: `getPhoto` → `CAMERA_UNAVAILABLE` (ожидаемо), `pickPhoto` — при наличии галереи.

- [x] Записать выводы в [aurora/verification-status.md](aurora/verification-status.md) (запись V-camera).



### Native-реализация



- [x] **`getPhoto`:** `CameraCapturePage.qml` (QtMultimedia) → `writeAppDataFile` → `Photo` (`width`/`height`/`format` опционально).

- [x] **`pickPhoto`:** `PickPhotoPage.qml` (`ImagePickerPage`) → копирование в app-data, в JSON только resource URL.

- [x] Учесть аргументы `quality`, `allowEditing` — `quality` (JPEG re-encode); `allowEditing` — no-op, задокументировано в [plugins/camera.md](plugins/camera.md).

- [x] **`CAMERA_CANCELLED`** — back/закрытие picker/capture UI, `cancel()`.

- [x] **`CAMERA_CAPTURE_FAILED`** — ошибка записи, параллельный вызов, сбой capture.

- [x] **`CAMERA_UNAVAILABLE`** — нет `CameraBridge`, камера недоступна (`Camera.available`), не дефолт stub.

- [x] Async: deferred `invoke` (пустой `QVariant`) → `emitOutbound` по сигналу `CameraBridge` (см. [native-sdk/README.md](../runtime/native-sdk/README.md)).



### Верификация и docs



- [x] **`camera-demo`:** preview через `resolveResourceUrl(photo)`; код и UI обновлены.

- [ ] **Sign-off на физическом устройстве:** journal без `CAMERA_UNAVAILABLE` при успешной съёмке/выборе.

- [x] Обновить [plugins/camera.md](plugins/camera.md) и [compatibility-matrix.md](aurora/compatibility-matrix.md) — убрать пометку A3 scaffold.

- [x] `pnpm container:all` — плагин Camera registered, M3 OK (SDK 5.2.1.200 эмулятор).



**Выход P1:** фото с камеры и из галереи доступны в WebView по resource URL; демо показывает preview.



---



## P2 — Geolocation (GPS и watch)



**Цель:** `getCurrentPosition` и стрим `watch` отдают реальные координаты; `clearWatch` и `sub.stop()` останавливают native-источник.



См. [plugins/geolocation.md](plugins/geolocation.md), FR-B8, permission `Location`.



### Исследование



- [x] Qt Positioning (`QGeoPositionInfoSource`) на Aurora SDK: доступность на эмуляторе vs физическое устройство.

- [x] Модель разрешения `Location` в `.desktop` и поведение при отказе (ожидаем `BRIDGE_PERMISSION_DENIED` на мосту).

- [x] Соответствие `watchId` в `clearWatch` и `subscriptionId` стрима — зафиксировать контракт (alias или явный id в первом `data`).



### Native-реализация



- [x] **`getCurrentPosition`:** однократный запрос с учётом `enableHighAccuracy`, `timeout`, `maximumAge`.

- [x] **`watch`:** подписка на обновления → `emitStream(id, "data", Position)` через `StreamPublisher` (прореживание по `streamMaxFps`).

- [x] **`cancel(id)` / `sub.stop()`:** остановить `QGeoPositionInfoSource`, не слать `data` после отмены.

- [x] **`clearWatch({ watchId })`:** отмена по id (согласовано с id стрима).

- [x] **`GEOLOCATION_CANCELLED`** — отмена запроса пользователем (если API ОС это различает).

- [x] **`GEOLOCATION_UNAVAILABLE`** — нет источника позиции (эмулятор без mock GPS).



### Верификация и docs



- [x] **`geo-demo`:** координаты на устройстве; на эмуляторе без GPS — осмысленный `GEOLOCATION_UNAVAILABLE`, не crash.

- [x] Обновить [plugins/geolocation.md](plugins/geolocation.md), compatibility-matrix.

- [x] Loopback или unit-тест маппинга `Position` (timestamp, поля optional).



**Выход P2:** watch не перегружает JS; отмена подписки останавливает native GPS.



---



## P3 — Sensors (акселерометр, гироскоп)



**Цель:** стримы `watchAccelerometer` и `watchGyroscope` отдают `SensorReading` с реального железа.



См. [plugins/sensors.md](plugins/sensors.md), FR-B8. Разрешений в манифесте нет; при необходимости motion — отдельная итерация манифеста.



### Исследование



- [x] Qt Sensors (`QAccelerometer`, `QGyroscope`) на целевых устройствах Аврора; частота опроса vs backpressure.

- [x] Поведение на эмуляторе x86 (ожидаем `SENSORS_UNAVAILABLE`).



### Native-реализация



- [x] **`watchAccelerometer` / `watchGyroscope`:** подписка → `StreamPublisher::push` с `{ x, y, z, timestamp }`.

- [x] **`cancel(id)`:** останов сенсора, `emitStream(complete)` или тишина по контракту стрима.

- [x] **`SENSORS_UNAVAILABLE`** — сенсор не найден / не поддерживается.

- [x] **`SENSORS_CANCELLED`** — явная отмена (опционально в `error` фазе стрима).



### Верификация и docs



- [x] Минимальное демо или секция в `hello-world` / отдельный `sensors-demo` (кнопки start/stop, лог readings).

- [ ] Ручная проверка на **физическом устройстве** (эмулятор не обязан иметь IMU).

- [x] Обновить [plugins/sensors.md](plugins/sensors.md).



**Выход P3:** высокочастотные данные не деградируют UI благодаря backpressure (проверка на устройстве).



---



## P4 — Notifications (локальные)



**Цель:** `notify` / `schedule` / `cancel` / `cancelAll` работают; нажатие доставляется как `notification:tap`.



См. [plugins/notifications.md](plugins/notifications.md), permission `Notifications`.



### Исследование



- [x] API локальных уведомлений Аврора (Nemo / Lipstick / D-Bus) — создание, отложенные, отмена, payload для tap.

- [x] Жизненный цикл: приложение в фоне / cover / killed — что гарантируем в Alpha+ (минимум: foreground + resume).



### Native-реализация



- [x] **`notify`:** показать уведомление, вернуть `{ id }` (стабильный id из args или UUID).

- [x] **`schedule`:** отложенное по `scheduleAt` (мс); ограничения ОС задокументировать.

- [x] **`cancel` / `cancelAll`:** снять с публикации / таймера.

- [x] **`notification:tap`:** `router()->emitEvent("notification:tap", { id, action? })` при активации из шторки.

- [x] **`NOTIFICATIONS_UNAVAILABLE`** — сервис уведомлений недоступен.

- [x] Хранение активных id в плагине (map id → native handle) для cancel.



### Верификация и docs



- [x] Демо `notifications-demo` или расширение существующего example (`notify` + подписка на tap).

- [ ] Ручная проверка tap → JS handler на эмуляторе/устройстве.

- [x] Обновить [plugins/notifications.md](plugins/notifications.md).



**Выход P4:** локальное уведомление видно в системном UI; tap доходит до JS.



---



## P5 — Share (системный шаринг)



**Цель:** `shareText`, `shareUrl`, `shareFile` открывают системный share sheet Авроры.



См. [plugins/share.md](plugins/share.md). Для `shareFile` — разрешение resource URL через AssetResolver (как Camera).



### Исследование



- [x] Sailfish Share / `Sailfish.Share` `ShareAction` (`sailfish-components-share-qt5`) — Harbour-allowed с SFOS 4.2; доп. permissions не нужны.

- [x] Передача файла: локальный путь из `ScopeValidator::resolveAppDataPath` для `aurobore-app://localhost/app-data/...`.



### Native-реализация



- [x] **`shareText` / `shareUrl`:** системный диалог шаринга.

- [x] **`shareFile`:** resolve `aurobore-app://localhost/app-data/...` → файл в app-data → share.

- [x] **`SHARE_CANCELLED`** — пользователь закрыл sheet.

- [x] **`SHARE_UNAVAILABLE`** — API шаринга недоступен.



### Верификация и docs



- [x] Демо: шаринг текста и файла (файл из Echo `getSampleResource`).

- [x] Обновить [plugins/share.md](plugins/share.md).



**Выход P5:** шаринг текста, ссылки и файла из app-data через системный UI.



---



## Сквозные задачи (все плагины)



- [ ] **Ошибки:** каждый код из `plugin.manifest` `errors` достижим в native или покрыт тестом `errors-audit` (P1–P3 — не аудировано отдельно).

- [x] **NFR-7:** исключения в плагине не роняют Runtime — `try/catch` в `PluginManager` (уже есть; не регрессировать).

- [x] **Permissions (P1–P4):** `camera-demo` → `Camera`, `geo-demo` → `Location`; `sensors-demo` — без motion; `notifications-demo` → `Notifications`.

- [x] **Документация (P1–P5):** [camera.md](plugins/camera.md), [geolocation.md](plugins/geolocation.md), [sensors.md](plugins/sensors.md), [notifications.md](plugins/notifications.md), [share.md](plugins/share.md), [plugins/README.md](plugins/README.md), [using-plugins.md](tutorials/using-plugins.md).

- [x] **Compatibility matrix (P1–P5):** [aurora/compatibility-matrix.md](aurora/compatibility-matrix.md) — пять plugin-demos.

- [ ] **Conformance (Beta, FR-T1):** после реализации — тесты в conformance-suite (вне этого плана, см. [checklists.md](checklists.md) §6).



---



## Критерий выхода (post-A3 plugins)



| Плагин | Критерий «готово» |

|--------|-------------------|

| Camera | Реальное фото/picker → `Photo.url`, preview в WebView; коды CANCELLED/FAILED |

| Geolocation | Position на устройстве; watch + cancel; backpressure на стриме |

| Sensors | Readings на устройстве; UNAVAILABLE на эмуляторе без IMU |

| Notifications | notify + tap event; schedule/cancel по возможностям ОС |

| Share | shareText/Url/File через системный UI |



**Минимум для sign-off:** P1 + P2 на физическом устройстве; P3–P5 — реализация + ручная верификация;

эмулятор может оставаться с `*_UNAVAILABLE` там, где нет железа/API.



---



## Открытые верификации



| ID | Содержание | Плагин | Статус |

|----|------------|--------|--------|

| V-camera | Camera / Pickers на SDK 5.1.x–5.2.x | P1 | 🟡 реализовано; sign-off на устройстве |

| V-geo | Qt Positioning, mock на эмуляторе | P2 | 🟡 реализовано; sign-off на устройстве |

| V-sensors | Qt Sensors на реальном устройстве | P3 | 🟡 реализовано; sign-off на устройстве |

| V-notif | Local notifications + tap → JS | P4 | 🟡 реализовано; sign-off tap на устройстве |

| V-share | Share sheet + file from app-data | P5 | 🟡 реализовано; sign-off на устройстве |



Записи переносятся в [aurora/verification-status.md](aurora/verification-status.md) по мере закрытия.



---



## Окружение



Как в [alpha-plan.md](alpha-plan.md): Aurora SDK (mb2), эмулятор, `pnpm container:all`.



Для P1, P2, P3, P4 **желателен физический телефон** (камера, GPS, IMU, реальные уведомления).

Нативная проверка: `pnpm container:build` → deploy → run; демо — `aurobore build` / `aurobore run` в `examples/*-demo/`.



См. [tools/aurora/README.md](../tools/aurora/README.md), [demo-verification](../.cursor/rules/demo-verification.mdc).



## Связь с Beta



Полноценная реализация плагинов A3 — предпосылка для:



- **FR-T1** — conformance-suite по каждому плагину;

- **FR-D4** — автоген справочника API (манифесты уже готовы);

- стабилизация API перед заморозкой в RC.



Детальный план Beta — [roadmap.md](roadmap.md) §4.
