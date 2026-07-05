import QtQuick 2.6

Item {
    id: root

    property var webView
    property var allowedOrigins
    property bool triggered: false
    property bool verifyPending: false
    property bool clearPending: false
    property bool setViaRedirect: false

    readonly property string cookieTestUrl: "https://httpbin.org/anything"
    readonly property string cookieSetUrl: "https://httpbin.org/cookies/set/foo/bar"

    function stopTimers() {
        startTimer.stop()
    }

    function maybeRun() {
        if (!webView)
            return
        if (triggered)
            return
        if (typeof allowedOrigins === "undefined" || !allowedOrigins || allowedOrigins.length === 0) {
            console.log("[aurobore-container] W5 cookie test: skipped (web.allowedOrigins empty)")
            return
        }
        var originAllowed = false
        for (var m = 0; m < allowedOrigins.length; m++) {
            if (cookieTestUrl.indexOf(allowedOrigins[m]) === 0) {
                originAllowed = true
                break
            }
        }
        if (!originAllowed) {
            console.log("[aurobore-container] W5 cookie test: skipped (add https://httpbin.org to web.allowedOrigins)")
            return
        }
        if (typeof webViewCookieBridge === "undefined" || !webViewCookieBridge) {
            console.log("[aurobore-container] W5 cookie test: skipped (webViewCookieBridge unavailable)")
            return
        }
        triggered = true
        setViaRedirect = true
        console.log("[aurobore-container] W5 cookie test: navigating to", cookieSetUrl)
        webView.url = cookieSetUrl
    }

    function maybeContinueRedirect(urlString, httpStatusCode) {
        if (!webView)
            return
        if (!setViaRedirect || httpStatusCode >= 400)
            return
        if (urlString.indexOf("httpbin.org/cookies/set") < 0)
            return
        setViaRedirect = false
        console.log("[aurobore-container] W5 cookie test: setCookie OK (httpbin redirect)")
        verifyPending = true
        webView.url = cookieTestUrl
    }

    function verifyCookieHeader(clearPhase) {
        if (!webView)
            return
        webView.runJavaScript(
            "(function(){ try { return document.body ? document.body.innerText : ''; } catch(e) { return ''; } })()",
            function (bodyText) {
                var text = bodyText || ""
                var hasFoo = text.indexOf("foo=bar") >= 0 || text.indexOf("\"foo\": \"bar\"") >= 0
                if (clearPhase) {
                    if (!hasFoo) {
                        console.log("[aurobore-container] W5 cookie OK: cleared")
                    } else {
                        console.log("[aurobore-container] W5 cookie test: cookie still present after clearCookies")
                    }
                    clearPending = false
                    return
                }
                if (hasFoo) {
                    console.log("[aurobore-container] W5 cookie OK: Cookie header verified")
                    verifyPending = false
                    clearPending = true
                    if (typeof webViewCookieBridge !== "undefined" && webViewCookieBridge) {
                        webViewCookieBridge.clearAllCookies()
                        console.log("[aurobore-container] W5 cookie test: clearCookies, reloading", cookieTestUrl)
                        webView.url = cookieTestUrl
                    }
                } else {
                    console.log("[aurobore-container] W5 cookie test: Cookie header not found in response")
                    verifyPending = false
                }
            },
            function (err) {
                console.log("[aurobore-container] W5 cookie test: runJavaScript error:", err)
                verifyPending = false
                clearPending = false
            }
        )
    }

    function maybeVerifyLoad(urlString, httpStatusCode) {
        if (httpStatusCode >= 400)
            return
        if (urlString.indexOf("httpbin.org") < 0)
            return
        if (verifyPending && urlString.indexOf(cookieTestUrl) === 0) {
            verifyCookieHeader(false)
            return
        }
        if (clearPending && urlString.indexOf(cookieTestUrl) === 0) {
            verifyCookieHeader(true)
        }
    }

    Timer {
        id: startTimer
        interval: 15000
        repeat: false
        onTriggered: root.maybeRun()
    }

    Connections {
        target: webView
        onLoadingChanged: {
            if (loading)
                return
            if (assetServerOrigin && assetServerOrigin.length > 0
                    && url.indexOf(assetServerOrigin) === 0) {
                if (!root.triggered)
                    startTimer.start()
            }
        }
        onLoadFinished: {
            root.maybeContinueRedirect(url, httpStatusCode)
            root.maybeVerifyLoad(url, httpStatusCode)
        }
    }

    Connections {
        target: typeof webViewCookieBridge !== "undefined" ? webViewCookieBridge : null
        onCookieSet: {
            if (!root.webView || !success)
                return
            console.log("[aurobore-container] W5 cookie test: navigating to", root.cookieTestUrl)
            root.verifyPending = true
            root.webView.url = root.cookieTestUrl
        }
    }
}
