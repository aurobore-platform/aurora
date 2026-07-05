import QtQuick 2.6

Item {
    id: root

    property var webView
    property var allowedOrigins
    property bool triggered: false

    function maybeRun() {
        if (!webView)
            return
        if (triggered)
            return
        if (typeof allowedOrigins === "undefined" || !allowedOrigins || allowedOrigins.length === 0) {
            console.log("[aurobore-container] W3 external test: skipped (web.allowedOrigins empty)")
            return
        }
        triggered = true
        var origin = allowedOrigins[0]
        var target = origin.charAt(origin.length - 1) === "/" ? origin : origin + "/"
        console.log("[aurobore-container] W3 external test: navigating to", target)
        webView.url = target
    }

    Connections {
        target: webView
        onLoadingChanged: {
            if (loading)
                return
            if (assetServerOrigin && assetServerOrigin.length > 0
                    && url.indexOf(assetServerOrigin) === 0) {
                root.maybeRun()
            }
            if (typeof allowedOrigins !== "undefined" && allowedOrigins.length > 0
                    && url.indexOf(allowedOrigins[0]) === 0) {
                console.log("[aurobore-container] W3 external test OK: loaded", allowedOrigins[0])
            }
        }
    }
}
