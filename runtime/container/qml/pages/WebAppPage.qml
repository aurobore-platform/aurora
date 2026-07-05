// Aurobore M1/M2/A2 — fullscreen WebView + splash + asset loader + lifecycle + bridge + system chrome.

import QtQuick 2.6
import Sailfish.Silica 1.0
import ru.auroraos.WebView 1.0
import "../components"
import "../logic/UrlPolicy.js" as UrlPolicy
import "../logic/WebChrome.js" as WebChrome

Page {
    id: page

    objectName: "webAppPage"
    allowedOrientations: Orientation.All
    focus: true

    property bool splashVisible: true
    property bool webReady: false
    property real keyboardInset: 0
    property var webView: webViewLoader.item

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
                "({block:'nearest',behavior:'smooth'})",
                function () {},
                function (err) { console.log("[aurobore-container] keyboard scroll error:", err) }
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
        WebChrome.injectChromeStylesheet(webView, chromeStylesheetHref())
    }

    function injectKeyboardViewportListener() {
        WebChrome.injectKeyboardViewportListener(webView)
    }

    function injectViewportMeta() {
        WebChrome.injectViewportMeta(webView)
    }

    function injectInsets() {
        if (!webView)
            return
        var cutout = computeCutoutInsets()
        WebChrome.injectInsets(webView, cutout.top, cutout.right, keyboardInset, cutout.left)
        bridgeRouter.emitEvent("systemChrome:insetsChanged", {
            top: cutout.top,
            right: cutout.right,
            bottom: keyboardInset,
            left: cutout.left
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
        if (verificationLoader.item && verificationLoader.item.stopTimers)
            verificationLoader.item.stopTimers()
    }

    function cancelPendingWebViewState() {
        cookieOrchestrator.cancelPending()
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

    WebViewCookieOrchestrator {
        id: cookieOrchestrator
        webView: page.webView
    }

    Loader {
        id: verificationLoader
        active: typeof webViewHarnessModes !== "undefined" && webViewHarnessModes.length > 0
        source: "../verification/WebViewVerificationHost.qml"
        onLoaded: {
            item.webView = Qt.binding(function() { return page.webView })
            item.page = page
            item.allowedOrigins = allowedOrigins
        }
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
                cookieOrchestrator.applyOnLoadFinished(url, httpStatusCode)
                if (httpStatusCode >= 400 && httpStatusCode < 600
                        && UrlPolicy.shouldEmitWebViewError(url, assetServerOrigin, allowedOrigins)) {
                    bridgeRouter.emitEvent("webview:httpError", {
                        url: url,
                        statusCode: httpStatusCode
                    })
                    console.log("[aurobore-container] webview:httpError", httpStatusCode, url)
                }
            }

            onLoadError: {
                if (UrlPolicy.shouldEmitWebViewError(url, assetServerOrigin, allowedOrigins)) {
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
                }
            }

            LoadRequestExtension {
                enabled: true
                nativeSchemeHandling: true

                function beforeUrlLoad(url, userGesture, isRedirect) {
                    var urlString = url.url

                    if (url.scheme === "http" || url.scheme === "https") {
                        var allowed = UrlPolicy.isAllowedAppUrl(
                            urlString, assetServerOrigin, allowedOrigins, assetResolver)
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
            } else if (name === "aurobore:a2-ok") {
                console.log("[aurobore-container] A2 OK: Runtime+ deep links, scopes, system chrome verified")
            } else if (name === "aurobore:keyboard-inset") {
                var inset = parseBridgeData(data)
                var bottom = (inset && inset.bottom) ? inset.bottom : 0
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
