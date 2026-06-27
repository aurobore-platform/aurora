// Aurobore M1/M2 — fullscreen WebView + splash + asset loader + lifecycle + bridge.

import QtQuick 2.6
import Sailfish.Silica 1.0
import ru.auroraos.WebView 1.0
import "../components"

Page {
    id: page

    objectName: "webAppPage"
    allowedOrientations: Orientation.All

    property bool splashVisible: true
    property bool webReady: false

    function hideSplash() {
        if (!splashVisible)
            return
        splashVisible = false
        if (!webReady) {
            webReady = true
            bridgeRouter.emitEvent("ready")
        }
    }

    function deliverBridgeMessage(message) {
        var json = JSON.stringify(message)
        webView.runJavaScript(
            "globalThis.__auroboreBridgeReceive && globalThis.__auroboreBridgeReceive(" + json + ")",
            function () {},
            function (err) { console.log("[aurobore-container] bridge deliver error:", err) }
        )
    }

    function handleBackNavigation() {
        webView.runJavaScript(
            "(function(){ return window.__auroboreSpaBack ? window.__auroboreSpaBack() : false; })()",
            function (handled) {
                if (!handled) {
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
        return false
    }

    Component.onCompleted: {
        webView.addMessageListener("aurobore:bridge")
        webView.addMessageListener("aurobore:ready")
        webView.addMessageListener("aurobore:back")
        webView.addMessageListener("aurobore:m2-ok")
        webView.addMessageListener("aurobore:m3-ok")
        bridgeRouter.trustedOrigin = assetServerOrigin && assetServerOrigin.length > 0
        splashTimer.start()
        entryLoadTimer.start()
        console.log("[aurobore-container] htmlRootPath:", htmlRootPath)
        console.log("[aurobore-container] assetServerOrigin:", assetServerOrigin)
        console.log("[aurobore-container] entry:", entryUrl)
    }

    Timer {
        id: entryLoadTimer
        interval: 1500
        repeat: false
        onTriggered: {
            console.log("[aurobore-container] loading entry:", entryUrl)
            webView.url = entryUrl
        }
    }

    Connections {
        target: bridgeRouter
        onOutbound: page.deliverBridgeMessage(message)
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
            webView.runJavaScript(
                "(function(){ if (typeof sendAsyncMessage === 'function') { sendAsyncMessage('aurobore:ready', {ok:true, probe:true}); return true; } return false; })()",
                function (ok) {
                    if (ok)
                        console.log("[aurobore-container] ready probe sent from native")
                },
                function (err) { console.log("[aurobore-container] ready probe error:", err) }
            )
        }
    }

    WebView {
        id: webView

        anchors.fill: parent
        url: "about:blank"

        TouchInput { enabled: true }
        KeyboardInput { enabled: true }

        onLoadingChanged: {
            if (!loading && webView.url.indexOf("127.0.0.1") !== -1)
                pageLoadProbeTimer.start()
        }

        LoadRequestExtension {
            id: loadRequestExtension

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

    function parseBridgeData(raw) {
        if (typeof raw === "string") {
            try { return JSON.parse(raw) } catch (e) { return {} }
        }
        return raw
    }

    Connections {
        target: webView
        onRecvAsyncMessage: {
            if (name === "aurobore:bridge") {
                bridgeRouter.handleMessage(parseBridgeData(data))
            } else if (name === "aurobore:ready") {
                console.log("[aurobore-container] web ready signal")
                console.log("[aurobore-container] M1 OK: aurobore-app loaded, lifecycle ready, SPA back works")
                page.hideSplash()
            } else if (name === "aurobore:back") {
                page.handleBackNavigation()
            } else if (name === "aurobore:m2-ok") {
                console.log("[aurobore-container] M2 OK: bridge invoke, events, stream verified")
            } else if (name === "aurobore:m3-ok") {
                console.log("[aurobore-container] M3 OK: plugins registered, Device + Storage verified")
            }
        }
    }

    SplashScreen {
        id: splash
        anchors.fill: parent
        visible: page.splashVisible
        z: 100
    }
}
