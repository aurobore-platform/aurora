import QtQuick 2.6

Item {
    id: host

    property var webView
    property var page
    property var allowedOrigins
    property var harnessModes: typeof webViewHarnessModes !== "undefined" ? webViewHarnessModes : []

    function modeActive(mode) {
        if (!harnessModes)
            return false
        for (var i = 0; i < harnessModes.length; i++) {
            if (harnessModes[i] === mode)
                return true
        }
        return false
    }

    function stopTimers() {
        if (w5Loader.item && w5Loader.item.stopTimers)
            w5Loader.item.stopTimers()
    }

    function bindHarness(loader) {
        if (!loader.item)
            return
        loader.item.webView = Qt.binding(function() { return host.webView })
        loader.item.allowedOrigins = Qt.binding(function() { return host.allowedOrigins })
        if (loader.item.page !== undefined)
            loader.item.page = host.page
    }

    Loader {
        id: w3Loader
        active: host.modeActive("w3")
        source: "WebViewW3ExternalHarness.qml"
        onLoaded: host.bindHarness(w3Loader)
    }

    Loader {
        id: w4Loader
        active: host.modeActive("w4")
        source: "WebViewW4AuthHarness.qml"
        onLoaded: host.bindHarness(w4Loader)
    }

    Loader {
        id: w5Loader
        active: host.modeActive("w5")
        source: "WebViewW5CookieHarness.qml"
        onLoaded: host.bindHarness(w5Loader)
    }

    Loader {
        id: w6Loader
        active: host.modeActive("w6")
        source: "WebViewW6DisposeHarness.qml"
        onLoaded: host.bindHarness(w6Loader)
    }
}
