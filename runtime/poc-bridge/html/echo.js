// Aurobore PoC — веб-сторона эхо-моста.
//
// Подтверждённые на SDK сигнатуры (docs/aurora/webview.md §5, plugins.qmltypes таргета):
//   - web -> native: глобальная функция sendAsyncMessage(name, data)
//   - native -> web: натив вызывает функцию страницы через runJavaScript(...) (здесь onEcho)
//
// Самопроверка (без кликов): на загрузке страница автоматически шлёт "echo".
// Полный круг: sendAsyncMessage("echo") -> QML onRecvAsyncMessage -> runJavaScript("onEcho(...)")
//            -> onEcho -> sendAsyncMessage("echo-ack") -> QML логирует "PoC OK".

(function () {
  "use strict";

  var logEl = document.getElementById("log");

  function log(line) {
    var ts = new Date().toISOString().substr(11, 12);
    if (logEl) logEl.textContent += "[" + ts + "] " + line + "\n";
    // Дублируем в консоль (может попасть в логи WebView).
    if (window.console && console.log) console.log("[poc-web] " + line);
  }

  function send(channel, payloadObj) {
    var data = JSON.stringify(payloadObj);
    log("web -> native [" + channel + "]: " + data);
    if (typeof sendAsyncMessage === "function") {
      sendAsyncMessage(channel, data);
    } else {
      log("ОШИБКА: sendAsyncMessage недоступна (запуск вне Aurora WebView?)");
    }
  }

  // Вызывается из native через runJavaScript("onEcho(...)").
  window.onEcho = function (data) {
    var text = typeof data === "string" ? data : JSON.stringify(data);
    log("native -> web: " + text);
    // Подтверждаем кругооборот: отправляем ack обратно в native.
    send("echo-ack", { ack: true, received: text });
  };

  var sendBtn = document.getElementById("send");
  if (sendBtn) {
    sendBtn.addEventListener("click", function () {
      send("echo", { text: document.getElementById("msg").value, ts: Date.now() });
    });
  }

  log("страница загружена; ожидаем мост Aurora WebView");

  // Самопроверка: автоотправка через короткую задержку (даём мосту инициализироваться).
  setTimeout(function () {
    send("echo", { text: "self-test привет, Аврора", ts: Date.now() });
  }, 800);
})();
