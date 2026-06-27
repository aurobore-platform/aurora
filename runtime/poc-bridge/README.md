# PoC: эхо-мост web ↔ native (M0 Spike)

Минимальный нативный контейнер Аврора для проверки моста Aurobore поверх штатного API
`ru.auroraos.WebView`. Прогнан на реальном **Aurora SDK 5.2.1.200** (эмулятор x86_64).

## Подтверждённый на SDK API моста (V-1)

Из `plugins.qmltypes` модуля `ru.auroraos.WebView` (тип `WebViewItem`):

| Элемент | Сигнатура |
|---|---|
| сигнал | `recvAsyncMessage(string name, QVariant data)` → обработчик `onRecvAsyncMessage` |
| метод | `sendAsyncMessage(string name, QVariant data)` |
| метод | `addMessageListener(string name)` |
| метод | `runJavaScript(string script, QJSValue callback, QJSValue errorCallback)` |
| метод | `loadHtml(string html)`; свойство `url` |

Это ровно та модель, на которой строится мост Aurobore (invoke/события/стримы).

## Состав

| Файл | Роль |
|---|---|
| `src/main.cpp` | Aurora-контейнер (libauroraapp) + **`WebEngineContext::InitBrowser()`** до загрузки QML. |
| `qml/ru.auroraos.poc-bridge.qml` | `WebView` + `addMessageListener` + `onRecvAsyncMessage` → `runJavaScript`. |
| `html/echo.html`, `echo.js`, `echo.css` | Веб-страница: автосамопроверка `sendAsyncMessage("echo")` и `onEcho` → `echo-ack`. |
| `CMakeLists.txt` | CMake + `pkgconfig(aurorawebview)` + `pkgconfig(auroraapp)`. |
| `rpm/ru.auroraos.poc-bridge.spec` | RPM; `BuildRequires: pkgconfig(aurorawebview)`, `Requires: ru.auroraos.webview`. |
| `ru.auroraos.poc-bridge.desktop` | Метаданные + `Permissions=Internet`. |

## Сборка и запуск

Рекомендуемый способ — **dev-toolkit** (M0.5), см. [tools/aurora/README.md](../../tools/aurora/README.md):

```powershell
# один раз: copy tools\aurora\local.env.example tools\aurora\local.env
pnpm poc:all          # sync → build → deploy → run
pnpm poc:build        # только сборка RPM
pnpm poc:run          # только запуск на эмуляторе (если RPM уже установлен)
```

Среда: Windows + Aurora SDK (`sfdk`), эмулятор QEMU. Исходники в репо — `runtime/poc-bridge`;
сборка идёт из **staging** (`%USERPROFILE%\aurobore-spike\poc-bridge` по умолчанию), т.к. Docker
build engine монтирует только домашний каталог и `C:\AuroraOS`.

### Ручной цикл (если нужен)

```powershell
pnpm poc:sync
pnpm poc:build
# RPMS/ru.auroraos.poc-bridge-0.1.0-1.x86_64.rpm в POC_BUILD_DIR
pnpm poc:deploy
pnpm poc:run
```

## Результаты прогона (подтверждено на эмуляторе)

- ✅ Контейнер собирается штатным Aurora SDK (CMake → RPM), устанавливается и запускается.
- ✅ CEF init: `InitBrowser(argc, argv, {"--default-encoding=UTF-8"})` в `main.cpp` (V-4).
- ✅ QML + `ru.auroraos.WebView`; `WebViewItem` создаётся.
- ✅ **V-2**: рантайм-RPM `ru.auroraos.webview`; devel — `ru.auroraos.webview-devel`.
- ✅ **V-3**: `libcef.so` в `/usr/lib/cef/`; нужен `LD_LIBRARY_PATH=/usr/lib/cef`.
- ✅ **Полный круг web↔native**: journal показывает
  `[poc-native] PoC OK: round-trip подтверждён` после self-test из `echo.js`.
- ✅ **Подпись (C-8)**: на dev-VM обход `--define '__transaction_validation %{nil}'`.
