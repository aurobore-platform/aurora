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

Среда: Windows + Aurora SDK (`C:\AuroraOS\bin\sfdk.exe`), движок сборки и эмулятор QEMU.
Проект собирается из общей папки SDK (`C:\Users\<user>\aurobore-spike\poc-bridge`), т.к. движок
монтирует только `C:\Users\<user>` и `C:\AuroraOS`:

```powershell
robocopy C:\inetpub2026\aurora\runtime\poc-bridge C:\Users\maxgr\aurobore-spike\poc-bridge /MIR /XD RPMS
cd C:\Users\maxgr\aurobore-spike\poc-bridge
sfdk -c target=AuroraOS-5.2.1.200-x86_64 build
# -> RPMS/ru.auroraos.poc-bridge-0.1.0-1.x86_64.rpm
```

**BuildRequires:** в snapshot таргета должен быть `ru.auroraos.webview-devel` (`pkgconfig(aurorawebview)`).
Установка: `sfdk tools target package-install ru.auroraos.webview-devel` (при необходимости пересоздать snapshot).

Деплой на эмулятор — по SSH (root, ключ `C:\AuroraOS\vmshare\ssh\private_keys\sdk`, порт 2223):

```sh
rpm -Uvh --replacepkgs --define '__transaction_validation %{nil}' ru.auroraos.poc-bridge-*.rpm

# запуск (libcef в /usr/lib/cef)
XDG_RUNTIME_DIR=/run/user/100000 WAYLAND_DISPLAY=/run/display/wayland-0 \
  LD_LIBRARY_PATH=/usr/lib/cef QT_QPA_PLATFORM=wayland \
  /usr/bin/ru.auroraos.poc-bridge
```

Скрипт `C:\Users\maxgr\aurobore-spike\run-poc.sh` автоматизирует запуск и сбор лога в `/tmp/poc.log`.

## Результаты прогона (подтверждено на эмуляторе)

- ✅ Контейнер собирается штатным Aurora SDK (CMake → RPM), устанавливается и запускается.
- ✅ CEF init: `InitBrowser(argc, argv, {"--default-encoding=UTF-8"})` в `main.cpp` (V-4).
- ✅ QML + `ru.auroraos.WebView`; `WebViewItem` создаётся.
- ✅ **V-2**: рантайм-RPM `ru.auroraos.webview`; devel — `ru.auroraos.webview-devel`.
- ✅ **V-3**: `libcef.so` в `/usr/lib/cef/`; нужен `LD_LIBRARY_PATH=/usr/lib/cef`.
- ✅ **Полный круг web↔native**: journal показывает
  `[poc-native] PoC OK: round-trip подтверждён` после self-test из `echo.js`.
- ✅ **Подпись (C-8)**: на dev-VM обход `--define '__transaction_validation %{nil}'`.
