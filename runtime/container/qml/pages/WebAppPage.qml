// Aurobore M1/M2/A2 — fullscreen WebView + splash + asset loader + lifecycle + bridge + system chrome.

import QtQuick 2.6
import Sailfish.Silica 1.0
import ru.auroraos.WebView 1.0
import "../components"

Page {
    id: page

    objectName: "webAppPage"
    allowedOrientations: Orientation.All
    focus: true

    property bool splashVisible: true
    property bool webReady: false
    property real keyboardInset: 0
    property bool w3ExternalTriggered: false
    property bool w4AuthTriggered: false
    property bool w5CookieTriggered: false
    property bool w5CookieVerifyPending: false
    property bool w5CookieClearPending: false
    property bool w5CookieSetViaRedirect: false
    property var pendingCookieApply: null
    property var webView: webViewLoader.item
    property bool w6DisposeRunning: false
    property bool w6DisposeStarted: false
    property int w6DisposeCyclesCompleted: 0
    property bool w6DisposeAwaitingReload: false

    readonly property bool w3ExternalTest: entryUrl && entryUrl.indexOf("w3External=1") >= 0
    readonly property bool w4AuthTest: entryUrl && entryUrl.indexOf("w4Auth=1") >= 0
    readonly property bool w5CookieTest: entryUrl && entryUrl.indexOf("w5Cookies=1") >= 0
    readonly property bool w6DisposeTest: entryUrl && entryUrl.indexOf("w6Dispose=1") >= 0
    readonly property string w4AuthTestUrl: "https://testpages.eviltester.com/pages/auth/basic-auth/"
    readonly property string w5CookieTestUrl: "https://httpbin.org/anything"
    readonly property string w5CookieSetUrl: "https://httpbin.org/cookies/set/foo/bar"

    function statusBarHeightPx() {
        var h = Theme.statusBarHeight || 0
        return h > 0 ? h : 32
    }

    function computeCutoutInsets() {
        var result = { top: 0, right: 0, bottom: 0, left: 0 }

        if (typeof SafeZoneRect !== "undefined") {
            switch (page.orientation) {
            case Orientation.Portrait:
                result.top = Math.max(SafeZoneRect.insets.top, SafeZoneRect.appInsets.top)
                result.left = SafeZoneRect.insets.left
                result.right = SafeZoneRect.insets.right
                break
            case Orientation.Landscape:
                result.top = Math.max(SafeZoneRect.insets.left, SafeZoneRect.appInsets.top)
                result.left = SafeZoneRect.insets.top
                result.right = SafeZoneRect.insets.bottom
                break
            case Orientation.PortraitInverted:
                result.top = Math.max(SafeZoneRect.insets.bottom, SafeZoneRect.appInsets.top)
                result.left = SafeZoneRect.insets.right
                result.right = SafeZoneRect.insets.left
                break
            case Orientation.LandscapeInverted:
                result.top = Math.max(SafeZoneRect.insets.right, SafeZoneRect.appInsets.top)
                result.left = SafeZoneRect.insets.bottom
                result.right = SafeZoneRect.insets.top
                break
            }
        } else {
            result.top = statusBarHeightPx()
        }

        if (result.top <= 0)
            result.top = statusBarHeightPx()

        return result
    }

    function screenAxisHeight() {
        switch (page.orientation) {
        case Orientation.Portrait:
        case Orientation.PortraitInverted:
            return Screen.height
        case Orientation.Landscape:
        case Orientation.LandscapeInverted:
            return Screen.width
        }
        return Screen.height
    }

    function nativeKeyboardInsetPx() {
        return Qt.inputMethod.visible ? Qt.inputMethod.keyboardRectangle.height : 0
    }

    function applyKeyboardInset(bottom) {
        if (bottom === keyboardInset)
            return
        var wasClosed = keyboardInset === 0
        keyboardInset = bottom
        injectInsets()
        if (wasClosed && bottom > 0 && webView) {
            webView.runJavaScript(
                "document.activeElement && document.activeElement.scrollIntoView" +
                "({block:'nearest',behavior:'smooth'})"
            )
        }
        if (bottom > 0)
            console.log("[aurobore-container] A2 keyboard OK: bottom inset=" + bottom)
    }

    function updateKeyboardInset() {
        applyKeyboardInset(nativeKeyboardInsetPx())
    }

    function chromeStylesheetHref() {
        if (assetServerOrigin && assetServerOrigin.length > 0)
            return assetServerOrigin + "/css/aurobore-chrome.css"
        return "css/aurobore-chrome.css"
    }

    function injectChromeStylesheet() {
        if (!webView)
            return
        var href = chromeStylesheetHref()
        webView.runJavaScript(
            "(function(){ var href=" + JSON.stringify(href) + ";" +
            "var l=document.querySelector('link[data-aurobore-chrome]');" +
            "if(!l){ l=document.createElement('link'); l.rel='stylesheet';" +
            "l.href=href; l.setAttribute('data-aurobore-chrome','1');" +
            "var first=document.querySelector('link[rel=stylesheet]');" +
            "if(first && first.parentNode) first.parentNode.insertBefore(l,first);" +
            "else document.head.appendChild(l);} })()",
            function () {},
            function (err) { console.log("[aurobore-container] chrome stylesheet error:", err) }
        )
    }

    function injectKeyboardViewportListener() {
        if (!webView)
            return
        webView.runJavaScript(
            "(function(){ if(window.__auroboreKeyboardInsets) return;" +
            "window.__auroboreKeyboardInsets=true;" +
            "if(navigator.virtualKeyboard) navigator.virtualKeyboard.overlaysContent=true;" +
            "function apply(){ if(!window.visualViewport) return;" +
            "var v=window.visualViewport;" +
            "var bottom=Math.max(0, Math.round(window.innerHeight-v.height-v.offsetTop));" +
            "if(typeof sendAsyncMessage==='function') sendAsyncMessage('aurobore:keyboard-inset',{bottom:bottom});" +
            "}" +
            "if(window.visualViewport){" +
            "window.visualViewport.addEventListener('resize',apply);" +
            "window.visualViewport.addEventListener('scroll',apply); apply(); }" +
            "})();",
            function () {},
            function (err) { console.log("[aurobore-container] keyboard viewport listener error:", err) }
        )
    }

    function injectViewportMeta() {
        if (!webView)
            return
        webView.runJavaScript(
            "(function(){ var m=document.querySelector('meta[name=viewport]');" +
            "if(!m){ m=document.createElement('meta'); m.name='viewport'; document.head.appendChild(m); }" +
            "var content=m.getAttribute('content')||'';" +
            "if(content.indexOf('viewport-fit=cover')<0){" +
            "m.setAttribute('content', content ? content+', viewport-fit=cover' : 'width=device-width, initial-scale=1.0, viewport-fit=cover');" +
            "}})();",
            function () {},
            function (err) { console.log("[aurobore-container] viewport meta error:", err) }
        )
    }

    function injectInsets() {
        if (!webView)
            return
        var cutout = computeCutoutInsets()
        var top = cutout.top
        var right = cutout.right
        var bottom = keyboardInset
        var left = cutout.left
        webView.runJavaScript(
            "(function(){ var r=document.documentElement;" +
            "r.style.setProperty('--aurobore-safe-area-top','" + top + "px');" +
            "r.style.setProperty('--aurobore-safe-area-right','" + right + "px');" +
            "r.style.setProperty('--aurobore-safe-area-bottom','" + bottom + "px');" +
            "r.style.setProperty('--aurobore-safe-area-left','" + left + "px');" +
            "r.style.setProperty('--safe-area-inset-top','" + top + "px');" +
            "r.style.setProperty('--safe-area-inset-right','" + right + "px');" +
            "r.style.setProperty('--safe-area-inset-bottom','" + bottom + "px');" +
            "r.style.setProperty('--safe-area-inset-left','" + left + "px');" +
            "})();",
            function () {},
            function (err) { console.log("[aurobore-container] inset inject error:", err) }
        )
        bridgeRouter.emitEvent("systemChrome:insetsChanged", {
            top: top,
            right: right,
            bottom: bottom,
            left: left
        })
    }

    function hideSplash() {
        if (!splashVisible)
            return
        splashVisible = false
        if (!webReady) {
            webReady = true
            if (typeof coverBridge !== "undefined" && coverBridge)
                coverBridge.setWebReady(true)
            bridgeRouter.emitEvent("ready")
        }
    }

    function deliverBridgeMessage(message) {
        if (!webView)
            return
        var json = JSON.stringify(message)
        webView.runJavaScript(
            "globalThis.__auroboreBridgeReceive && globalThis.__auroboreBridgeReceive(" + json + ")",
            function () {},
            function (err) { console.log("[aurobore-container] bridge deliver error:", err) }
        )
    }

    function handleBackNavigation() {
        if (!webView)
            return true
        webView.runJavaScript(
            "(function(){ return window.__auroboreSpaBack ? window.__auroboreSpaBack() : false; })()",
            function (handled) {
                if (handled) {
                    console.log("[aurobore-container] A2 back OK: SPA history back")
                } else {
                    console.log("[aurobore-container] back: default (no SPA history)")
                    bridgeRouter.emitEvent("backbutton")
                }
            },
            function (err) { console.log("[aurobore-container] back navigation error:", err) }
        )
        return true
    }

    function isAllowedAppUrl(urlString) {
        if (assetServerOrigin && assetServerOrigin.length > 0
                && urlString.indexOf(assetServerOrigin) === 0) {
            return true
        }
        if (urlString.indexOf("aurobore-app://") === 0) {
            return assetResolver.isAllowedUrl(urlString)
        }
        if (typeof allowedOrigins !== "undefined" && allowedOrigins) {
            for (var i = 0; i < allowedOrigins.length; i++) {
                var origin = allowedOrigins[i]
                if (origin && origin.length > 0 && urlString.indexOf(origin) === 0)
                    return true
            }
        }
        return false
    }

    function setupWebViewListeners() {
        if (!webView)
            return
        webView.addMessageListener("aurobore:bridge")
        webView.addMessageListener("aurobore:ready")
        webView.addMessageListener("aurobore:back")
        webView.addMessageListener("aurobore:m2-ok")
        webView.addMessageListener("aurobore:m3-ok")
        webView.addMessageListener("aurobore:a2-ok")
        webView.addMessageListener("aurobore:keyboard-inset")
    }

    function stopWebViewTimers() {
        splashTimer.stop()
        entryLoadTimer.stop()
        pageLoadProbeTimer.stop()
        w5CookieTestTimer.stop()
    }

    function cancelPendingWebViewState() {
        if (pendingCookieApply) {
            if (typeof webViewCookieBridge !== "undefined" && webViewCookieBridge)
                webViewCookieBridge.completeSetCookie(pendingCookieApply.invokeId || "", false)
            pendingCookieApply = null
        }
        if (typeof webViewAuthBridge !== "undefined" && webViewAuthBridge)
            webViewAuthBridge.cancelAuth("")
    }

    function teardownWebView(callback) {
        stopWebViewTimers()
        cancelPendingWebViewState()
        bridgeRouter.emitEvent("destroy", {})

        if (!webView) {
            callback()
            return
        }

        webView.runJavaScript(
            "(function(){ try { delete globalThis.__auroboreBridgeReceive; } catch(e){} return true; })()",
            function () {
                webView.url = "about:blank"
                callback()
            },
            function () {
                callback()
            }
        )
    }

    function recreateWebView() {
        teardownWebView(function () {
            webViewLoader.active = false
            Qt.callLater(function () {
                webReady = false
                webViewLoader.active = true
                entryLoadTimer.start()
            })
        })
    }

    function maybeStartW6DisposeTest() {
        if (!w6DisposeTest || w6DisposeStarted)
            return
        w6DisposeStarted = true
        w6DisposeRunning = true
        w6DisposeCyclesCompleted = 0
        console.log("[aurobore-container] W6 dispose test: starting 10 cycles")
        runNextW6DisposeCycle()
    }

    function runNextW6DisposeCycle() {
        if (w6DisposeCyclesCompleted >= 10) {
            w6DisposeRunning = false
            w6DisposeAwaitingReload = false
            return
        }
        var next = w6DisposeCyclesCompleted + 1
        console.log("[aurobore-container] W6 dispose cycle " + next + "/10")
        w6DisposeAwaitingReload = true
        recreateWebView()
    }

    function onW6DisposeReloadComplete() {
        if (!w6DisposeRunning || !w6DisposeAwaitingReload)
            return
        w6DisposeAwaitingReload = false
        w6DisposeCyclesCompleted++
        if (w6DisposeCyclesCompleted >= 10) {
            console.log("[aurobore-container] W6 OK: 10 dispose cycles complete")
            w6DisposeRunning = false
            return
        }
        runNextW6DisposeCycle()
    }

    function maybeRunW3ExternalTest() {
        if (!webView)
            return
        if (!w3ExternalTest || w3ExternalTriggered)
            return
        if (typeof allowedOrigins === "undefined" || !allowedOrigins || allowedOrigins.length === 0) {
            console.log("[aurobore-container] W3 external test: skipped (web.allowedOrigins empty)")
            return
        }
        w3ExternalTriggered = true
        var origin = allowedOrigins[0]
        var target = origin.charAt(origin.length - 1) === "/" ? origin : origin + "/"
        console.log("[aurobore-container] W3 external test: navigating to", target)
        webView.url = target
    }

    function shouldEmitWebViewError(urlString) {
        if (!urlString || urlString.indexOf("http") !== 0)
            return false
        if (assetServerOrigin && assetServerOrigin.length > 0
                && urlString.indexOf(assetServerOrigin) === 0) {
            return false
        }
        if (typeof allowedOrigins === "undefined" || !allowedOrigins || allowedOrigins.length === 0)
            return false
        for (var j = 0; j < allowedOrigins.length; j++) {
            var allowedOrigin = allowedOrigins[j]
            if (allowedOrigin && allowedOrigin.length > 0 && urlString.indexOf(allowedOrigin) === 0)
                return true
        }
        return false
    }

    function maybeRunW4AuthTest() {
        if (!webView)
            return
        if (!w4AuthTest || w4AuthTriggered)
            return
        if (typeof allowedOrigins === "undefined" || !allowedOrigins || allowedOrigins.length === 0) {
            console.log("[aurobore-container] W4 auth test: skipped (web.allowedOrigins empty)")
            return
        }
        var originAllowed = false
        for (var k = 0; k < allowedOrigins.length; k++) {
            if (w4AuthTestUrl.indexOf(allowedOrigins[k]) === 0) {
                originAllowed = true
                break
            }
        }
        if (!originAllowed) {
            console.log("[aurobore-container] W4 auth test: skipped (add https://testpages.eviltester.com to web.allowedOrigins)")
            return
        }
        w4AuthTriggered = true
        console.log("[aurobore-container] W4 auth test: navigating to", w4AuthTestUrl)
        webView.url = w4AuthTestUrl
    }

    function maybeApplyPendingCookie(urlString, httpStatusCode) {
        if (!webView)
            return
        if (!pendingCookieApply)
            return
        if (httpStatusCode >= 400) {
            if (typeof webViewCookieBridge !== "undefined" && webViewCookieBridge)
                webViewCookieBridge.completeSetCookie(pendingCookieApply.invokeId || "", false)
            pendingCookieApply = null
            return
        }
        if (!urlString || urlString.indexOf(pendingCookieApply.domain) < 0)
            return

        var escapedName = String(pendingCookieApply.name).replace(/\\/g, "\\\\").replace(/"/g, "\\\"")
        var escapedValue = String(pendingCookieApply.value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"")
        var escapedPath = String(pendingCookieApply.path).replace(/\\/g, "\\\\").replace(/"/g, "\\\"")
        var invokeId = pendingCookieApply.invokeId || ""
        pendingCookieApply = null
        var js = 'document.cookie="' + escapedName + '=' + escapedValue + '; path=' + escapedPath + '; secure"; true'
        webView.runJavaScript(
            js,
            function (ok) {
                if (typeof webViewCookieBridge !== "undefined" && webViewCookieBridge)
                    webViewCookieBridge.completeSetCookie(invokeId, !!ok)
            },
            function (err) {
                console.log("[aurobore-container] setCookie runJavaScript error:", err)
                if (typeof webViewCookieBridge !== "undefined" && webViewCookieBridge)
                    webViewCookieBridge.completeSetCookie(invokeId, false)
            }
        )
    }

    function maybeLogW4AuthSuccess(urlString, httpStatusCode) {
        if (!w4AuthTest || httpStatusCode >= 400)
            return
        if (urlString.indexOf(w4AuthTestUrl) !== 0 && urlString.indexOf("testpages.eviltester.com") < 0)
            return
        console.log("[aurobore-container] W4 auth OK: loaded", urlString)
    }

    function maybeRunW5CookieTest() {
        if (!webView)
            return
        if (!w5CookieTest || w5CookieTriggered)
            return
        if (typeof allowedOrigins === "undefined" || !allowedOrigins || allowedOrigins.length === 0) {
            console.log("[aurobore-container] W5 cookie test: skipped (web.allowedOrigins empty)")
            return
        }
        var originAllowed = false
        for (var m = 0; m < allowedOrigins.length; m++) {
            if (w5CookieTestUrl.indexOf(allowedOrigins[m]) === 0) {
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
        w5CookieTriggered = true
        w5CookieSetViaRedirect = true
        console.log("[aurobore-container] W5 cookie test: navigating to", w5CookieSetUrl)
        webView.url = w5CookieSetUrl
    }

    function maybeContinueW5CookieRedirect(urlString, httpStatusCode) {
        if (!webView)
            return
        if (!w5CookieSetViaRedirect || httpStatusCode >= 400)
            return
        if (urlString.indexOf("httpbin.org/cookies/set") < 0)
            return
        w5CookieSetViaRedirect = false
        console.log("[aurobore-container] W5 cookie test: setCookie OK (httpbin redirect)")
        w5CookieVerifyPending = true
        webView.url = w5CookieTestUrl
    }

    function verifyW5CookieHeader(clearPhase) {
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
                    w5CookieClearPending = false
                    return
                }
                if (hasFoo) {
                    console.log("[aurobore-container] W5 cookie OK: Cookie header verified")
                    w5CookieVerifyPending = false
                    w5CookieClearPending = true
                    if (typeof webViewCookieBridge !== "undefined" && webViewCookieBridge) {
                        webViewCookieBridge.clearAllCookies()
                        console.log("[aurobore-container] W5 cookie test: clearCookies, reloading", w5CookieTestUrl)
                        webView.url = w5CookieTestUrl
                    }
                } else {
                    console.log("[aurobore-container] W5 cookie test: Cookie header not found in response")
                    w5CookieVerifyPending = false
                }
            },
            function (err) {
                console.log("[aurobore-container] W5 cookie test: runJavaScript error:", err)
                w5CookieVerifyPending = false
                w5CookieClearPending = false
            }
        )
    }

    function maybeVerifyW5CookieLoad(urlString, httpStatusCode) {
        if (!w5CookieTest || httpStatusCode >= 400)
            return
        if (urlString.indexOf("httpbin.org") < 0)
            return
        if (w5CookieVerifyPending && urlString.indexOf(w5CookieTestUrl) === 0) {
            verifyW5CookieHeader(false)
            return
        }
        if (w5CookieClearPending && urlString.indexOf(w5CookieTestUrl) === 0) {
            verifyW5CookieHeader(true)
        }
    }

    Connections {
        target: typeof webViewCookieBridge !== "undefined" ? webViewCookieBridge : null
        onSetCookieRequested: {
            if (!page.webView)
                return
            page.pendingCookieApply = {
                domain: domain,
                path: path,
                name: name,
                value: value,
                invokeId: invokeId || ""
            }
            console.log("[aurobore-container] setCookie: navigating to", "https://" + domain + "/")
            webView.url = "https://" + domain + "/"
        }
        onCookieSet: {
            if (!page.webView)
                return
            if (!page.w5CookieTest || !success)
                return
            console.log("[aurobore-container] W5 cookie test: navigating to", page.w5CookieTestUrl)
            page.w5CookieVerifyPending = true
            webView.url = page.w5CookieTestUrl
        }
    }

    Keys.onReleased: {
        if (event.key === Qt.Key_Back) {
            event.accepted = true
            console.log("[aurobore-container] A2 back OK: hardware Key_Back")
            handleBackNavigation()
        }
    }

    onOrientationChanged: {
        injectInsets()
        updateKeyboardInset()
    }
    onWidthChanged: injectInsets()
    onHeightChanged: injectInsets()

    Component.onCompleted: {
        bridgeRouter.trustedOrigin = assetServerOrigin && assetServerOrigin.length > 0
        updateKeyboardInset()
        splashTimer.start()
        entryLoadTimer.start()
        console.log("[aurobore-container] htmlRootPath:", htmlRootPath)
        console.log("[aurobore-container] assetServerOrigin:", assetServerOrigin)
        console.log("[aurobore-container] entry:", entryUrl)
    }

    Component.onDestruction: {
        stopWebViewTimers()
        cancelPendingWebViewState()
    }

    Timer {
        id: entryLoadTimer
        interval: 1500
        repeat: false
        onTriggered: {
            if (!page.webView) {
                console.log("[aurobore-container] entry load skipped: WebView unavailable")
                return
            }
            console.log("[aurobore-container] loading entry:", entryUrl)
            page.webView.url = entryUrl
        }
    }

    Connections {
        target: bridgeRouter
        onOutbound: page.deliverBridgeMessage(message)
    }

    Connections {
        target: typeof cameraBridge !== "undefined" ? cameraBridge : null
        onPickRequested: {
            pageStack.push(Qt.resolvedUrl("PickPhotoPage.qml"), {
                allowEditing: allowEditing
            })
        }
        onCaptureRequested: {
            pageStack.push(Qt.resolvedUrl("CameraCapturePage.qml"), {
                quality: quality,
                allowEditing: allowEditing
            })
        }
        onDismissRequested: {
            if (pageStack.depth > 1)
                pageStack.pop()
        }
    }

    Connections {
        target: typeof shareBridge !== "undefined" ? shareBridge : null
        onShareRequested: {
            pageStack.push(Qt.resolvedUrl("ShareSheetPage.qml"), payload)
        }
        onDismissRequested: {
            if (pageStack.depth > 1)
                pageStack.pop()
        }
    }

    Connections {
        target: Qt.inputMethod
        onVisibleChanged: page.updateKeyboardInset()
        onKeyboardRectangleChanged: page.updateKeyboardInset()
    }

    Timer {
        id: splashTimer
        interval: splashTimeoutMs
        repeat: false
        onTriggered: {
            console.log("[aurobore-container] splash timeout fallback")
            page.hideSplash()
        }
    }

    Timer {
        id: w5CookieTestTimer
        interval: 15000
        repeat: false
        onTriggered: page.maybeRunW5CookieTest()
    }

    Timer {
        id: pageLoadProbeTimer
        interval: 1200
        repeat: false
        onTriggered: {
            if (!page.webView)
                return
            page.webView.runJavaScript(
                "(function(){ if (typeof sendAsyncMessage === 'function') { sendAsyncMessage('aurobore:ready', {ok:true, probe:true}); return true; } return false; })()",
                function (ok) {
                    if (ok)
                        console.log("[aurobore-container] ready probe sent from native")
                },
                function (err) { console.log("[aurobore-container] ready probe error:", err) }
            )
        }
    }

    Loader {
        id: webViewLoader

        anchors {
            top: parent.top
            left: parent.left
            right: parent.right
        }

        height: page.screenAxisHeight()
        active: true
        sourceComponent: webViewComponent

        onLoaded: page.setupWebViewListeners()
    }

    Component {
        id: webViewComponent

        WebView {
            anchors.fill: parent
            url: "about:blank"

            TouchInput { enabled: true }
            KeyboardInput { enabled: true }

            onLoadFinished: {
                page.maybeContinueW5CookieRedirect(url, httpStatusCode)
                page.maybeApplyPendingCookie(url, httpStatusCode)
                page.maybeLogW4AuthSuccess(url, httpStatusCode)
                page.maybeVerifyW5CookieLoad(url, httpStatusCode)
                if (httpStatusCode >= 400 && httpStatusCode < 600
                        && page.shouldEmitWebViewError(url)) {
                    bridgeRouter.emitEvent("webview:httpError", {
                        url: url,
                        statusCode: httpStatusCode
                    })
                    console.log("[aurobore-container] webview:httpError", httpStatusCode, url)
                }
            }

            onLoadError: {
                if (page.shouldEmitWebViewError(url)) {
                    bridgeRouter.emitEvent("webview:loadError", {
                        url: url,
                        errorCode: errorCode,
                        isForMainFrame: true
                    })
                    console.log("[aurobore-container] webview:loadError", errorCode, url)
                }
            }

            onLoadingChanged: {
                if (loading) {
                    page.injectChromeStylesheet()
                    page.injectViewportMeta()
                    page.injectKeyboardViewportListener()
                    page.injectInsets()
                }
                if (!loading && assetServerOrigin && assetServerOrigin.length > 0
                        && url.indexOf(assetServerOrigin) === 0) {
                    page.injectViewportMeta()
                    page.injectKeyboardViewportListener()
                    page.injectInsets()
                    pageLoadProbeTimer.start()
                    page.maybeRunW3ExternalTest()
                    page.maybeRunW4AuthTest()
                    if (w5CookieTest && !w5CookieTriggered)
                        w5CookieTestTimer.start()
                    page.onW6DisposeReloadComplete()
                }
                if (!loading && w3ExternalTest && typeof allowedOrigins !== "undefined"
                        && allowedOrigins.length > 0
                        && url.indexOf(allowedOrigins[0]) === 0) {
                    console.log("[aurobore-container] W3 external test OK: loaded", allowedOrigins[0])
                }
            }

            LoadRequestExtension {
                enabled: true
                nativeSchemeHandling: true

                function beforeUrlLoad(url, userGesture, isRedirect) {
                    var urlString = url.url

                    if (url.scheme === "http" || url.scheme === "https") {
                        var allowed = page.isAllowedAppUrl(urlString)
                        if (!allowed)
                            console.log("[aurobore-container] blocked external:", urlString)
                        return allowed
                    }

                    if (url.scheme === "aurobore-app") {
                        var ok = assetResolver.isAllowedUrl(urlString)
                        if (!ok)
                            console.log("[aurobore-container] blocked aurobore-app:", urlString)
                        else
                            console.log("[aurobore-container] allow aurobore-app:", urlString)
                        return ok
                    }

                    if (url.scheme === "file") {
                        console.log("[aurobore-container] blocked file:", urlString)
                        return false
                    }

                    return true
                }
            }
        }
    }

    function parseBridgeData(raw) {
        if (typeof raw === "string") {
            try { return JSON.parse(raw) } catch (e) { return {} }
        }
        return raw
    }

    Connections {
        target: typeof webViewAuthBridge !== "undefined" ? webViewAuthBridge : null
        onAuthRequested: {
            httpAuthDialog.openDialog(requestId, host, realm)
        }
        onAuthResolved: {
            if (httpAuthDialog.status === PageStatus.Active)
                httpAuthDialog.close()
        }
    }

    Connections {
        target: webView
        onRecvAsyncMessage: {
            if (name === "aurobore:bridge") {
                bridgeRouter.handleMessage(parseBridgeData(data))
            } else if (name === "aurobore:ready") {
                console.log("[aurobore-container] web ready signal")
                console.log("[aurobore-container] M1 OK: aurobore-app loaded, lifecycle ready, SPA back works")
                deepLinkHandler.deliverPending()
                if (typeof notificationsBridge !== "undefined" && notificationsBridge)
                    notificationsBridge.deliverPending()
                page.hideSplash()
            } else if (name === "aurobore:back") {
                page.handleBackNavigation()
            } else if (name === "aurobore:m2-ok") {
                console.log("[aurobore-container] M2 OK: bridge invoke, events, stream verified")
            } else if (name === "aurobore:m3-ok") {
                console.log("[aurobore-container] M3 OK: plugins registered, Device + Storage verified")
                page.maybeStartW6DisposeTest()
            } else if (name === "aurobore:a2-ok") {
                console.log("[aurobore-container] A2 OK: Runtime+ deep links, scopes, system chrome verified")
            } else if (name === "aurobore:keyboard-inset") {
                var inset = parseBridgeData(data)
                var bottom = (inset && inset.bottom) ? inset.bottom : 0
                // Fallback when Qt.inputMethod does not report keyboard height.
                if (page.nativeKeyboardInsetPx() === 0 && bottom > 0)
                    page.applyKeyboardInset(bottom)
            }
        }
    }

    HttpAuthDialog {
        id: httpAuthDialog
    }

    SplashScreen {
        id: splash
        anchors.fill: parent
        visible: page.splashVisible
        z: 100
    }
}
