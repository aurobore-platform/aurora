# Чек-листы

> Соответствует пункту 12 задачи. Набор чек-листов для контроля качества на разных этапах.
> Используются агентами (Reviewer/Release Manager) и людьми. Отмечать `[x]` по мере выполнения.
>
> **Sign-off этапа Design (2026-06-27, кандидат на ревью):** разделы **§1 (архитектура)** и
> **§3 (документация)** проставлены как пройденные с обоснованиями-ссылками. Остальные разделы относятся
> к реализации (MVP+) и пока не отмечаются.

## 1. Архитектурный чек-лист
- [x] Все компоненты описаны (Runtime, Bridge, Plugin System/Loader, Events, Config, Build, Dev Server, CLI, SDK). → отдельный документ на компонент в [`architecture/`](architecture/README.md).
- [x] Потоки данных (вызов, событие, стрим) задокументированы и согласованы. → [bridge.md](architecture/bridge.md), [event-system.md](architecture/event-system.md).
- [x] Версионирование протокола/Runtime/плагинов/конфига определено и непротиворечиво (NFR-5). → `bridgeProtocolVersion` ([ADR-002](adr/ADR-002-bridge-model.md)), конфиг/манифест ([ADR-006](adr/ADR-006-configuration-format.md)), плагины (FR-P4).
- [x] Модель безопасности (разрешения, области, источник моста) описана (NFR-2). → [ADR-002](adr/ADR-002-bridge-model.md), [runtime.md](architecture/runtime.md), [aurora/sandbox-and-permissions.md](aurora/sandbox-and-permissions.md).
- [x] Целевой движок Chromium/CEF подтверждён; Gecko вне поддержки; шов транспорта тонкий (ADR-004, NFR-3). → [ADR-004](adr/ADR-004-webview-engine-abstraction.md); подтверждено официально ([aurora/verification-status.md](aurora/verification-status.md), C-1/C-7).
- [x] Каждое ключевое решение зафиксировано в ADR; спорные — в RFC. → [adr/README.md](adr/README.md) (ADR-001…009 = Accepted); шаблон+кандидаты RFC ([rfc/README.md](rfc/README.md)).
- [x] Требования (`FR-*`/`NFR-*`) трассируются к компонентам и roadmap. → [requirements.md](requirements.md) ↔ [roadmap.md](roadmap.md).
- [x] Принцип SoT (манифест → код/типы/доки) соблюдён, дублирования нет. → [ADR-003](adr/ADR-003-plugin-api.md), [ADR-008](adr/ADR-008-typescript-sdk-codegen.md), [plugin-system.md](architecture/plugin-system.md).

## 2. Инфраструктурный чек-лист
- [x] Монорепо настроено (pnpm workspaces, root scripts в `package.json`).
- [x] CI: сборка JS-пакетов, линт, format:check, типы, модульные тесты (`.github/workflows/ci.yml`, Node 20/22).
- [ ] CI: сборка нативного контейнера под Аврора (job `native` есть, **`if: false`** — до self-hosted runner с SDK; локально `pnpm container:all` / `pnpm poc:all`).
- [ ] Кэширование сборок; детерминированность (NFR-11).
- [ ] Версионирование/релизы (changesets) и публикация в npm.
- [ ] Политики веток, ревью, шаблоны PR/issue.
- [ ] Лицензия, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT на месте (NFR-10).
- [ ] Матрица целевых версий Аврора/движков в CI (по возможности — эмулятор).

## 3. Чек-лист документации
- [x] Индекс `docs/README.md` актуален и связывает все документы. → [README.md](README.md) (вкл. раздел `aurora/`).
- [x] Видение, требования, глоссарий заполнены. → [vision.md](vision.md), [requirements.md](requirements.md), [glossary.md](glossary.md).
- [x] Документ по каждому компоненту существует и актуален. → [`architecture/`](architecture/README.md).
- [x] Plugin API и каталог плагинов описаны. → [plugins/plugin-api.md](plugins/plugin-api.md), [plugins/standard-plugins.md](plugins/standard-plugins.md).
- [x] ADR/RFC ведутся; есть шаблоны. → [adr/](adr/README.md), [rfc/](rfc/README.md) (шаблоны ADR-000/RFC-000).
- [x] Туториалы (быстрый старт, первый плагин, публикация) запланированы/написаны. → [tutorials/README.md](tutorials/README.md) (MVP: quick-start, using-plugins, events-and-lifecycle).
- [ ] Справочник API генерируется из манифестов (FR-D4). → проектно покрыто ([ADR-008](adr/ADR-008-typescript-sdk-codegen.md), [typescript-sdk.md](architecture/typescript-sdk.md)); **реализация — MVP/Beta**, поэтому не отмечено на Design.
- [x] Допущения об Аврора помечены как подлежащие верификации. → [aurora/verification-status.md](aurora/verification-status.md), [aurora/sources.md](aurora/sources.md).

## 4. Runtime чек-лист
- [x] Bootstrap и порядок инициализации определены.
- [x] WebView создаётся на CEF/Chromium (`ru.auroraos.webview`) через тонкий шов транспорта.
- [x] Splash показывается/скрывается (по сигналу готовности + таймаут-fallback).
- [x] Lifecycle-события прокидываются в JS (ready/pause/resume/backbutton/…).
- [x] Навигация SPA + аппаратная «назад» (`Qt.Key_Back` → SPA history / `backbutton`, V-14).
- [x] Asset Loader: loopback HTTPS origin (`https://127.0.0.1:<port>/`) + логический ключ `aurobore-app://localhost/…`; не `file://` для entry (V-13; см. [runtime/container/README.md](../runtime/container/README.md)).
- [x] Разрешения сопоставляются с конфигом (`AppConfig::grantedPermissions()` ← `config/defaults.json`; см. [`runtime/container/src/AppConfig.cpp`](../runtime/container/src/AppConfig.cpp)).
- [x] Deep links обрабатываются (→ Alpha, FR-R8): `DeepLinkHandler`, `deeplink` / `appurlopen`, [tutorials/deep-links.md](tutorials/deep-links.md).
- [x] Scopes на мосту (FR-R9): `ScopeValidator`, `BRIDGE_SCOPE_DENIED`, codegen `scopes` в `PluginDescriptor`.
- [x] Исключение в плагине не роняет Runtime (NFR-7): `PluginManager::dispatchInvoke` try/catch → `RUNTIME_PLUGIN_ERROR`.

## 5. Bridge чек-лист
- [x] Формат сообщений (invoke/response/event/stream) и версия протокола зафиксированы.
- [x] Корреляция запрос↔ответ, таблица ожидания, таймауты.
- [x] Promise API; отмена через AbortSignal (JS + native cancel).
- [x] События двунаправленные; стримы с backpressure/coalescing (A1, FR-B8).
- [x] Сериализация JSON; бинарные данные — через ResourceRef + Asset Loader (A1, FR-B7).
- [x] Структурированные ошибки с пространствами имён кодов.
- [x] Проверка источника (`trustedOrigin` ← asset server), разрешений по манифесту, method whitelist (M3); scopes на мосту (A2, FR-R9); deep links — A2.
- [x] Транспорт на WebView async API + loopback для тестов; шов тонкий.

## 6. Plugin API чек-лист
- [x] Формат манифеста определён (методы/события/типы/разрешения/nativeDeps/compat). → [`plugins/plugin-api.md`](plugins/plugin-api.md), [`packages/build/src/manifest/`](../packages/build/src/manifest/).
- [x] Кодоген JS-обёртки и TS-типов из манифеста работает. → `pnpm codegen:plugins`, [`packages/build/src/codegen/`](../packages/build/src/codegen/).
- [x] Статическая регистрация (build-time) + инициализация (runtime) описаны/реализованы. → [`architecture/plugin-loader.md`](architecture/plugin-loader.md), `PluginRegistry`.
- [x] **Plugin Manager** на native вместо hardcode `Echo` в `BridgeRouter` (→ M3).
- [x] Проверка совместимости плагина при загрузке (`bridgeProtocol`, `checkPluginCompat` в CLI). → [`PluginManager.cpp`](../runtime/native-sdk/PluginManager.cpp), [`packages/build/src/plugins/resolve.ts`](../packages/build/src/plugins/resolve.ts).
- [x] Native SDK предоставляет контракты методов/событий/стримов/ошибок. → [`runtime/native-sdk/README.md`](../runtime/native-sdk/README.md).
- [ ] Conformance-тесты для плагина проходят (FR-T1). → Beta.
- [x] Документация и пример к плагину есть. → [plugins/README.md](plugins/README.md), [plugins/*.md](plugins/), [hello-world](../../examples/hello-world/).

## 7. CLI чек-лист
- [x] Команды create/dev/build/run/plugin/doctor работают (FR-C1…C6). → [`packages/cli/src/cli.ts`](../packages/cli/src/cli.ts).
- [x] Понятные ошибки и подсказки; `doctor` даёт actionable-советы (NFR-6). → [`packages/cli/src/doctor.ts`](../packages/cli/src/doctor.ts).
- [x] Валидация конфига на каждом запуске. → `loadConfig` / `config validate`.
- [x] dev: live reload + HMR (Vite) / esbuild watch для vanilla.
- [x] plugin add/remove/list корректно меняют артефакты без ручной правки.
- [x] Иконки лаунчера генерируются в native-проект и попадают в RPM (86/108/128/172, `hicolor`). → [`packages/build/src/native/icons.ts`](../packages/build/src/native/icons.ts), V-15.
- [x] Переводы нативного UI: `translations/*.ts`, `qt5_add_translation`, `.qm` в RPM. → [`packages/build/src/native/translations.ts`](../packages/build/src/native/translations.ts).
- [x] (SHOULD) plugin create. → `aurobore plugin create`, [`packages/build/src/plugins/create.ts`](../packages/build/src/plugins/create.ts).
- [ ] (SHOULD) generate, publish, migrate.

## 8. SDK чек-лист
- [x] `@aurobore/core` публикует API, события, модель ошибок, типы.
- [x] Пакеты плагинов генерируются и типизированы.
- [x] Совместимость SDK ↔ протокол/Runtime проверяется (`checkBridgeProtocol`).
- [x] (SHOULD) адаптеры для React/Vue/Svelte. → `@aurobore/react`, `@aurobore/vue`, `@aurobore/svelte`.
- [ ] Семантическое версионирование и changelog.

## 9. Чек-лист тестирования
- [ ] Модульные тесты в каждом пакете.
- [x] Тесты моста на loopback-транспорте → [`packages/bridge-js/src/bridge.test.ts`](../packages/bridge-js/src/bridge.test.ts).
- [x] e2e: create→build→run→проверка вызова/события/стрима. → `pnpm e2e:verify`, [dev/e2e-testing.md](dev/e2e-testing.md).
- [ ] Conformance-suite для плагинов (FR-T1).
- [x] Матрица версий Аврора/движков (NFR-3). → [aurora/compatibility-matrix.md](aurora/compatibility-matrix.md); прогон `pnpm compat:verify`.
- [ ] Тесты безопасности (отказ разрешений, посторонний источник).
- [ ] Тесты ошибок/таймаутов/отмены.

## 10. Чек-лист подготовки к релизу
- [ ] Публичный API/конфиг/манифест/протокол заморожены (RC).
- [ ] Все чек-листы выше пройдены.
- [ ] Аудит безопасности и производительности выполнен.
- [ ] CHANGELOG и версии готовы; semver соблюдён.
- [ ] Документация и примеры полны и проверены.
- [ ] `publish` для пакетов/приложения протестирован.
- [x] Известные ограничения и матрица совместимости опубликованы. → [aurora/compatibility-matrix.md](aurora/compatibility-matrix.md).
- [ ] Нет открытых блокеров.
