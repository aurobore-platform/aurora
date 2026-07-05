# План post-W: декомпозиция WebView и config pipeline (W+)

> Продолжение [webview-improvements-plan.md](webview-improvements-plan.md) (W1–W7 ✅).
> Цель — снять техдолг после спайков W3–W6: **production QML без harness-кода**,
> **config pipeline для гибридов**, явная пометка interim W5, декомпозиция крупных файлов runtime.

## Контекст

W1–W7 закрыли parity с OMP (`webview_flutter_aurora`), но оставили:

| Проблема | Где | Риск |
|---|---|---|
| Harness W3–W6 в production QML | [`WebAppPage.qml`](../../runtime/container/qml/pages/WebAppPage.qml) (~230 строк, ~30% файла) | cost of change lifecycle WebView |
| Query-параметры `w3External=1` … в `entryUrl` | [`main.cpp`](../../runtime/container/src/main.cpp) + WebAppPage | prod-приложения не должны тащить test flags |
| `web.allowedOrigins` только в container `defaults.json` | нет в schema / `generateDefaultsJson` | W4/W5 мёртвый код в `aurobore build` |
| W5 `setCookie` через navigate + `document.cookie` | WebAppPage + `WebViewCookieBridge` | не задокументирован как interim; ломает UX при invoke |
| Монолит ~800 строк | WebAppPage.qml | сложно ревьюить и расширять (A2 chrome, bridge, plugins, WebView) |

Bundled SPA (10 examples) **не страдают** — harness inactive при пустом `allowedOrigins`.
План не меняет поведение prod до явного включения задач.

---

## W+1 — Вынести harness W3–W6 из production QML (приоритет: высокий)

**Цель:** `WebAppPage.qml` не содержит test-only свойств, функций и таймеров; верификация W3–W6
остаётся в dev-toolkit (`pnpm container:run` + env).

### Текущее состояние

- Флаги: `w3ExternalTest` … `w6DisposeTest` из query в `entryUrl` (проставляет `main.cpp` по `AUROBORE_W3_EXTERNAL` …).
- Функции: `maybeRunW3ExternalTest`, `maybeRunW4AuthTest`, `maybeRunW5CookieTest`, `runNextW6DisposeCycle`, …
- Таймер: `w5CookieTestTimer`.
- Hooks в `onLoadFinished` / `onLoadingChanged` WebView.

### Целевая структура

```
runtime/container/qml/
  verification/                    # только container / dev; не копируется в prod apps (см. W+1.4)
    WebViewVerificationHost.qml    # Loader root: включает harness по contextProperty
    WebViewW3ExternalHarness.qml
    WebViewW4AuthHarness.qml
    WebViewW5CookieHarness.qml
    WebViewW6DisposeHarness.qml
  pages/
    WebAppPage.qml                 # без W*-properties и W*-functions
```

### Шаги

1. **`WebViewVerificationHost.qml`** — `Item` с API:
   - `property var webView` (binding на Loader.item)
   - `property var page` (родитель WebAppPage для `recreateWebView`)
   - `property var allowedOrigins`
   - `property string harnessMode` — `"w3"` | `"w4"` | `"w5"` | `"w6"` | `""` (пусто = inactive)
   - Сигналы/callbacks: `onDisposeCycleComplete`, `onExternalLoadOk`, … для journal-строк.

2. **Перенести** все `maybeRunW*`, `verifyW5*`, W6 cycle logic в соответствующие harness-QML.

3. **`main.cpp`:** вместо query в `entryUrl` — context property:
   ```cpp
   rootContext->setContextProperty("webViewHarnessMode", harnessMode);
   ```
   где `harnessMode` собирается из `AUROBORE_W3_EXTERNAL` … (как сейчас, но без порчи entry URL).

4. **WebAppPage:** один `Loader` для verification:
   ```qml
   Loader {
       active: typeof webViewHarnessMode !== "undefined" && webViewHarnessMode !== ""
       source: "../verification/WebViewVerificationHost.qml"
       // bindings: webView, page, allowedOrigins, harnessMode
   }
   ```

5. **Production WebView callbacks** — только W4/W5 prod-path:
   - `shouldEmitWebViewError`, `maybeApplyPendingCookie`, auth dialog — **остаются** (это не harness).
   - W3 navigate / W4 auto-navigate eviltester / W5 httpbin redirect test / W6 10 cycles — **только** в verification/.

### W+1.4 — Sync в generated apps ✅

[`generateNativeProject`](../../packages/build/src/native/generate.ts) копирует `runtime/container` в `.aurobore/native`,
исключая `qml/verification/` через `SYNC_EXCLUDE_PATHS` (вариант **B** из таблицы ниже).

| Вариант | Плюс | Минус |
|---|---|---|
| **A.** Копировать `verification/`, inactive без env | один источник, проще sync | мёртвый код в `.aurobore/native` |
| **B.** `SYNC_EXCLUDE` для `qml/verification/` | чистый prod tree | harness только в repo container |
| **C.** `#ifdef AUROBORE_CONTAINER_HARNESS` + условная сборка | zero dead code | сложнее CMake |

**Реализовано (B):** `SYNC_EXCLUDE_PATHS` в `generate.ts`; container dev-toolkit sync из repo (`pnpm container:sync`) — без exclude.

### Критерий готовности

- `WebAppPage.qml` < 550 строк; нет `w3ExternalTest` / `w5CookieTestUrl` и т.п.
- `AUROBORE_W4_AUTH=1 pnpm container:run` — journal `W4 auth OK` без изменений.
- `grep -r "eviltester\|w5CookieTest" runtime/container/qml/pages/` — пусто.
- `pnpm container:all` — M1/M2/M3 OK.

---

## W+2 — `web.allowedOrigins` в schema и generator (приоритет: средний, **gate: гибридный example**)

**Цель:** declarative whitelist external HTTPS из `aurobore.config.json` → `config/defaults.json` →
`AppConfig::allowedOrigins()` → QML `allowedOrigins` (как в container harness сейчас).

### Gate (когда начинать)

Реализовать **не раньше**, чем появится первый **реальный** гибридный example, например:

- `examples/hybrid-demo` — bundled SPA + iframe/link на whitelist origin, или
- корпоративный intranet stub с Basic Auth.

До gate: W4/W5 prod-код в runtime допустим, но конфиг остаётся container-only.

### Целевые файлы

| Слой | Файл |
|---|---|
| Schema | [`packages/build/schema/aurobore.config.schema.json`](../../packages/build/schema/aurobore.config.schema.json) |
| Types | [`packages/build/src/config/types.ts`](../../packages/build/src/config/types.ts) — `WebConfig.allowedOrigins?: string[]` |
| Parse/validate | [`packages/build/src/config/parse.ts`](../../packages/build/src/config/parse.ts) |
| Generator | [`packages/build/src/native/generate.ts`](../../packages/build/src/native/generate.ts) — `generateDefaultsJson` |
| Docs | [`docs/architecture/build-system.md`](../architecture/build-system.md), tutorial quick start |

### Правила валидации

```json
"allowedOrigins": {
  "type": "array",
  "items": {
    "type": "string",
    "pattern": "^https://[^/]+"
  },
  "uniqueItems": true
}
```

- Только **`https://`** (не `http://`, не wildcard) — parity с secure context и URL policy.
- При непустом `allowedOrigins` — **warning/error без `Internet`** в permissions (lint rule в parse).
- Пустой массив / отсутствие поля — bundled-only (default).

### Шаги

1. Schema + types + parse + unit tests (`parse.test.ts`, `generate.test.ts`).
2. `generateDefaultsJson`: `"web": { …, "allowedOrigins": effective.web.allowedOrigins ?? [] }`.
3. Hybrid example + `pnpm demos:verify` entry (после gate).
4. Строка в [verification-status.md](../aurora/verification-status.md): `V-webview-allowedOrigins-config` 🟢.

### Критерий готовности

- `aurobore build` на hybrid example → `rpm -ql` + runtime journal: external URL из whitelist грузится.
- Bundled examples без поля — без регрессии.

---

## W+3 — W5 interim: документация и API contract (приоритет: средний) ✅

**Цель:** явно зафиксировать, что `setCookie` — **временная** реализация до public native API на SDK.

### Изменения в docs

[`docs/aurora/webview.md`](../aurora/webview.md) §6.3 — добавить блок **«Interim implementation (SDK ≤5.2.x)»**:

| Аспект | Interim (сейчас) | Target (когда SDK/OMP даст API) |
|---|---|---|
| `setCookie` | Navigate на `https://<domain>/` + `document.cookie` в QML | `CookieManager::setCookie` native |
| HttpOnly | ❌ | ✅ (если API поддержит) |
| UX | Краткий flash navigation | Без navigation |
| `clearCookies` | Native `deleteCookies("", "")` | без изменений |

Дополнительно:

- JSDoc / `@aurobore/core` (если появится public helper) — `@deprecated interim`.
- Комментарий в [`WebViewCookieBridge.cpp`](../../runtime/container/src/WebViewCookieBridge.cpp) + [`WebAppPage.qml`](../../runtime/container/qml/pages/WebAppPage.qml) (или `WebViewCookieOrchestrator.qml` после W+4) — ссылка на W+3 и issue/SDK version gate.

### Follow-up (не блокер W+3)

- **W+3b:** при обновлении SDK — spike `CookieManager::setCookie` в devel headers; если есть — заменить QML orchestration, сохранить bridge API.

### Критерий

- §6.3 содержит слово «interim» и таблицу migration; verification-status — пометка «W5 setCookie: interim until native API».

---

## W+4 — Декомпозиция `WebAppPage.qml` (приоритет: высокий)

**Цель:** файл-оркестратор ~250–350 строк; ответственности разнесены по компонентам.

### Карта текущего файла (~875 строк)

| Блок | Строки (approx) | Куда |
|---|---|---|
| W3–W6 harness | ~230 | W+1 → `qml/verification/` |
| A2 system chrome (insets, keyboard, inject JS) | ~170 | `qml/logic/WebChrome.js` + thin wrappers |
| URL policy `isAllowedAppUrl` | ~20 | `qml/logic/UrlPolicy.js` |
| WebView lifecycle (teardown, recreate, listeners) | ~70 | `qml/components/WebViewLifecycle.js` или methods в `AuroboreWebView.qml` |
| WebView instance + LoadRequestExtension | ~110 | `qml/components/AuroboreWebView.qml` |
| Cookie orchestration (prod W5) | ~50 | `qml/components/WebViewCookieOrchestrator.qml` |
| HTTP auth Connections + dialog | ~30 | уже `HttpAuthDialog.qml`; Connections рядом или в orchestrator |
| Bridge delivery + plugin page pushes | ~80 | остаётся в WebAppPage |
| Splash, timers, layout | ~60 | остаётся в WebAppPage |

### Целевое дерево

```
runtime/container/qml/
  logic/
    WebChrome.js           # injectInsets, keyboard, viewport, chrome CSS
    UrlPolicy.js           # isAllowedAppUrl(allowedOrigins, assetServerOrigin, …)
  components/
    AuroboreWebView.qml    # WebView + Touch/Keyboard + LoadRequestExtension + signals
    WebViewCookieOrchestrator.qml
    HttpAuthDialog.qml     # (exists)
    SplashScreen.qml       # (exists)
  pages/
    WebAppPage.qml         # Page: Loader(AuroboreWebView), splash, bridge, plugin routes
  verification/            # W+1
```

### `AuroboreWebView.qml` — контракт

- **Properties:** `allowedOrigins`, `assetServerOrigin`, `assetResolver` (context).
- **Signals:** `readyProbeNeeded`, `loadFinishedWhitelisted(url, statusCode)`, `loadErrorWhitelisted(…)`.
- **Methods:** `runBridgeScript`, `navigate(url)` — thin wrappers.
- **LoadRequestExtension** внутри; вызывает `UrlPolicy.isAllowedAppUrl(...)`.

WebAppPage подписывается на signals для bridge events (`webview:httpError`) и вызывает chrome inject через `WebChrome.*`.

### Ограничения QML

- Qt Quick 2.6 / Sailfish — **без** `.pragma library` ES modules; использовать `.js` с `import "logic/WebChrome.js" as WebChrome`.
- Избегать циклических import между QML; orchestrator получает `webView` через property binding.

### Критерий

- `WebAppPage.qml` ≤ 350 строк.
- `pnpm container:all` — A2 chrome OK, M1/M2/M3 OK, W4/W5/W6 harness (после W+1) OK.
- Новый разработчик находит URL policy за < 1 минуту (`UrlPolicy.js`).

---

## W+5 — Прочие крупные файлы (приоритет: низкий)

### Runtime

| Файл | Строк | Действие |
|---|---|---|
| [`main.cpp`](../../runtime/container/src/main.cpp) | ~223 | После W+1: вынести harness env → `WebViewHarnessConfig.cpp` (~40 строк) |
| [`AssetSchemeServer.cpp`](../../runtime/container/src/AssetSchemeServer.cpp) | ~205 | OK; декомпозиция не срочна |
| [`WebViewAuthBridge.cpp`](../../runtime/container/src/WebViewAuthBridge.cpp) | ~152 | OK |
| [`CameraCapturePage.qml`](../../runtime/container/qml/pages/CameraCapturePage.qml) | ~119 | OK |

### Build package

| Файл | Строк | Действие |
|---|---|---|
| [`generate.ts`](../../packages/build/src/native/generate.ts) | ~592 | Split: `generate-spec.ts`, `generate-cmake.ts`, `generate-defaults.ts`, `generate-sync.ts` — **после W+2**, когда добавится allowedOrigins |
| [`parse.ts`](../../packages/build/src/config/parse.ts) | ~269 | Расширить при W+2; split не обязателен |
| [`init.ts`](../../packages/build/src/project/init.ts) | ~465 | Отложить; шаблон vanilla не зависит от WebView |

### Bridge-native

Монолитов >200 строк в `runtime/bridge-native` нет — декомпозиция не требуется.

---

## W+6 — Реестр verification-status (приоритет: низкий)

Добавить в [verification-status.md](../aurora/verification-status.md) §2:

| # | Вопрос | Статус |
|---|---|---|
| V-webview-harness-split | Harness W3–W6 вынесен из WebAppPage (W+1) | 🟢 |
| V-webview-allowedOrigins-config | `web.allowedOrigins` в aurobore.config → defaults.json (W+2) | ⏳ |
| V-webview-setcookie-interim | W5 setCookie documented as interim (W+3) | 🟢 |
| V-webview-qml-decompose | WebAppPage ≤350 строк, AuroboreWebView component (W+4) | ⏳ |

---

## Порядок работ

```
W+3 (docs interim W5) ── можно параллельно, быстрый win
        │
W+1 (harness extract) ──► W+4 (WebAppPage decompose) ──► W+5.1 (main.cpp harness config)
        │
W+2 (allowedOrigins config) ── gate: hybrid example готов
        │
W+6 (registry) ── по завершении каждого пункта
```

**Рекомендуемая первая итерация (1 PR):** W+3 + W+1 + начало W+4 (`AuroboreWebView.qml` + `UrlPolicy.js`).

**Вторая итерация:** W+4 завершение + W+5.1.

**Третья (по gate):** W+2 + hybrid example.

---

## Риски и mitigations

| Риск | Mitigation |
|---|---|
| Harness перестанет работать после extract | Сохранить env `AUROBORE_W*`; один integration test journal strings в README toolkit |
| `.js` logic не видит context properties | Передавать явно параметрами функций, не через global |
| SYNC_EXCLUDE verification/ сломает container:sync | Container toolkit sync из repo root, не из `.aurobore/native` |
| W+2 без hybrid example — мёртвая config field | Gate: не мёржить W+2 без example + demos:verify |

---

## См. также

- [webview-improvements-plan.md](webview-improvements-plan.md) — исходный W1–W7
- [aurora/webview.md](../aurora/webview.md) — факты WebView API
- [native-plugin-guide.md](native-plugin-guide.md) — паттерн bridge/plugin
- [runtime/container/README.md](../../runtime/container/README.md)
- [alpha-plugins-plan.md](../alpha-plugins-plan.md) — параллельный трек A3-плагинов
