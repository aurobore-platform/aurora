// Aurobore M1/M2/A2 — fullscreen WebView + splash + asset loader + lifecycle + bridge + system chrome.

import QtQuick 2.6
import Sailfish.Silica 1.0
import "../components"
import "../logic/UrlPolicy.js" as UrlPolicy
import "../logic/WebChrome.js" as WebChrome
import "../logic/BridgeMessages.js" as BridgeMessages

Page {
    id: page

    objectName: "webAppPage"
    allowedOrientations: Orientation.All
    focus: true

    property bool splashVisible: true
    property bool webReady: false
    property real keyboardInset: 0
    property real baselineInnerHeight: 0
    property real webCssScale: WebChrome.computeWebCssScale(0, 0, Screen.devicePixelRatio)
    property var webView: webViewLoader.item

    function statusBarHeightPx() {
        return WebChrome.statusBarHeightPx(Theme.statusBarHeight)
    }

    function screenAxisHeight() {
        return WebChrome.screenAxisHeight(page.orientation, Screen.width, Screen.height)
    }

    function nativeKeyboardInsetPx() {
        return Qt.inputMethod.visible ? Qt.inputMethod.keyboardRectangle.height : 0
    }

    function captureBaselineInnerHeight() {
        if (!webView)
            return
        webView.runJavaScript(
            "window.innerHeight",
            function (h) { page.baselineInnerHeight = h || 0 },
            function (err) { console.log("[aurobore-container] baseline innerHeight error:", err) }
        )
    }

    function commitKeyboardInset(bottom, wasClosed) {
        if (bottom === keyboardInset)
            return
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

    function applyKeyboardInset(bottom) {
        if (bottom === keyboardInset)
            return
        var wasClosed = keyboardInset === 0
        if (bottom <= 0) {
            commitKeyboardInset(0, wasClosed)
            captureBaselineInnerHeight()
            return
        }
        if (!webView) {
            commitKeyboardInset(bottom, wasClosed)
            return
        }
        webView.runJavaScript(
            "window.innerHeight",
            function (innerHeight) {
                var current = innerHeight || 0
                var baseline = page.baselineInnerHeight
                var effective = bottom
                if (baseline > 0 && current > 0 && current < baseline - 1) {
                    console.log("[aurobore-container] A2 keyboard WARN: viewport shrunk, skip CSS inset")
                    effective = 0
                }
                page.commitKeyboardInset(effective, wasClosed)
            },
            function (err) {
                console.log("[aurobore-container] keyboard innerHeight check error:", err)
                page.commitKeyboardInset(bottom, wasClosed)
            }
        )
    }

    function updateKeyboardInset() {
        var nativePx = nativeKeyboardInsetPx()
        if (nativePx <= 0) {
            applyKeyboardInset(0)
            return
        }
        applyKeyboardInset(WebChrome.qmlPxToWebCss(nativePx, webCssScale))
    }

    function calibrateWebCssScale() {
        if (!webView) {
            injectInsets()
            updateKeyboardInset()
            return
        }
        var axis = screenAxisHeight()
        var dpr = Screen.devicePixelRatio
        webView.runJavaScript(
            "window.innerHeight",
            function (innerHeight) {
                var scale = WebChrome.computeWebCssScale(axis, innerHeight || 0, dpr)
                if (Math.abs(scale - page.webCssScale) > 0.001) {
                    page.webCssScale = scale
                    console.log("[aurobore-container] webCssScale=" + scale +
                        " (qmlAxis=" + axis + ", innerHeight=" + (innerHeight || 0) + ")")
                }
                page.injectInsets()
                page.updateKeyboardInset()
            },
            function (err) {
                console.log("[aurobore-container] webCssScale calibrate error:", err)
                page.injectInsets()
                page.updateKeyboardInset()
            }
        )
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
        var safeZone = typeof SafeZoneRect !== "undefined" ? SafeZoneRect : null
        var cutout = WebChrome.computeCutoutInsets(page.orientation, safeZone, statusBarHeightPx())
        var top = WebChrome.qmlPxToWebCss(cutout.top, webCssScale)
        var right = WebChrome.qmlPxToWebCss(cutout.right, webCssScale)
        var left = WebChrome.qmlPxToWebCss(cutout.left, webCssScale)
        WebChrome.injectInsets(webView, top, right, keyboardInset, left)
        bridgeRouter.emitEvent("systemChrome:insetsChanged", {
            top: top,
            right: right,
            bottom: keyboardInset,
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

    onOrientationChanged: calibrateWebCssScale()
    onWidthChanged: calibrateWebCssScale()
    onHeightChanged: calibrateWebCssScale()

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
            if (!page.webView || page.webReady)
                return
            page.webView.runJavaScript(
                "(function(){ if (typeof sendAsyncMessage === 'function') { sendAsyncMessage('aurobore:ready', 'probe'); return true; } return false; })()",
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
    }

    Component {
        id: webViewComponent

        AuroboreWebView {
            anchors.fill: parent
        }
    }

    Connections {
        target: webView
        onLoadFinished: {
            if (!webView)
                return
            cookieOrchestrator.applyOnLoadFinished(webView.url, webView.httpStatusCode)
        }
        onLoadFinishedWhitelisted: {
            bridgeRouter.emitEvent("webview:httpError", {
                url: url,
                statusCode: statusCode
            })
            console.log("[aurobore-container] webview:httpError", statusCode, url)
        }
        onLoadErrorWhitelisted: {
            bridgeRouter.emitEvent("webview:loadError", {
                url: url,
                errorCode: errorCode,
                isForMainFrame: true
            })
            console.log("[aurobore-container] webview:loadError", errorCode, url)
        }
        onChromeInjectRequested: {
            page.injectChromeStylesheet()
            page.injectViewportMeta()
            page.injectKeyboardViewportListener()
            page.calibrateWebCssScale()
        }
        onBundledLoadComplete: {
            page.injectViewportMeta()
            page.injectKeyboardViewportListener()
            page.calibrateWebCssScale()
            page.captureBaselineInnerHeight()
        }
        onReadyProbeNeeded: pageLoadProbeTimer.start()
        onRecvAsyncMessage: BridgeMessages.handleRecvAsyncMessage(
            name, data, page, bridgeRouter, deepLinkHandler,
            typeof notificationsBridge !== "undefined" ? notificationsBridge : null)
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
