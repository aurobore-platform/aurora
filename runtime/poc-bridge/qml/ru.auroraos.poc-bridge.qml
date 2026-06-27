// Aurobore PoC — native-сторона эхо-моста (QML-only, подтверждено на SDK 5.2.1.200).
//
// Точные сигнатуры WebViewItem из plugins.qmltypes таргета (формальное закрытие V-1):
//   signal recvAsyncMessage(string name, QVariant data)   -> обработчик onRecvAsyncMessage
//   method runJavaScript(string script, QJSValue cb, QJSValue errCb)
//   method sendAsyncMessage(string name, QVariant data)
//   method addMessageListener(string name)
//   method loadHtml(string html); property url
//
// htmlRootPath — контекст-свойство из main.cpp (путь к share/<appid>/html).

import QtQuick 2.6
import ru.auroraos.WebView 1.0

Item {
    id: root
    width: 540
    height: 960

    WebView {
        id: webView
        anchors.fill: parent
        url: htmlRootPath + "/echo.html"

        // Расширения ввода (см. webview.md §3); добавляются как дочерние к WebViewItem.
        TouchInput { enabled: true }
        KeyboardInput { enabled: true }

        Component.onCompleted: {
            // Регистрируем каналы до взаимодействия с пользователем.
            webView.addMessageListener("echo");
            webView.addMessageListener("echo-ack");
            console.log("[poc-native] WebView готов, слушатели echo/echo-ack зарегистрированы");
        }
    }

    Connections {
        target: webView
        // Параметры сигнала: name (string), data (QVariant — то, что web передал в sendAsyncMessage).
        onRecvAsyncMessage: {
            if (name === "echo") {
                console.log("[poc-native] web -> native [echo]: " + JSON.stringify(data));
                // Эхо обратно в web. JSON.stringify(data) сериализует QVariant в безопасный
                // JS-литерал для подстановки в вызов onEcho(...).
                webView.runJavaScript(
                    "onEcho(" + JSON.stringify(data) + ")",
                    function (ok) {},
                    function (err) { console.log("[poc-native] runJavaScript error:", err); }
                );
            } else if (name === "echo-ack") {
                // Замкнули полный круг web -> native -> web -> native.
                console.log("[poc-native] PoC OK: round-trip подтверждён, ack=" + JSON.stringify(data));
            }
        }
    }
}
