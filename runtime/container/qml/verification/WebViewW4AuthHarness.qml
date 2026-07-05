import QtQuick 2.6

Item {
    id: root

    property var webView
    property var allowedOrigins
    property bool triggered: false

    readonly property string authTestUrl: "https://testpages.eviltester.com/pages/auth/basic-auth/"

    function maybeRun() {
        if (!webView)
            return
        if (triggered)
            return
        if (typeof allowedOrigins === "undefined" || !allowedOrigins || allowedOrigins.length === 0) {
            console.log("[aurobore-container] W4 auth test: skipped (web.allowedOrigins empty)")
            return
        }
        var originAllowed = false
        for (var k = 0; k < allowedOrigins.length; k++) {
            if (authTestUrl.indexOf(allowedOrigins[k]) === 0) {
                originAllowed = true
                break
            }
        }
        if (!originAllowed) {
            console.log("[aurobore-container] W4 auth test: skipped (add https://testpages.eviltester.com to web.allowedOrigins)")
            return
        }
        triggered = true
        console.log("[aurobore-container] W4 auth test: navigating to", authTestUrl)
        webView.url = authTestUrl
    }

    function maybeLogSuccess(urlString, httpStatusCode) {
        if (httpStatusCode >= 400)
            return
        if (urlString.indexOf(authTestUrl) !== 0 && urlString.indexOf("testpages.eviltester.com") < 0)
            return
        console.log("[aurobore-container] W4 auth OK: loaded", urlString)
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
        }
        onLoadFinished: {
            root.maybeLogSuccess(url, httpStatusCode)
        }
    }
}
