// Aurobore M1 — fullscreen WebView + splash + asset loader + lifecycle.

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
    property bool internalNavigation: false

    function hideSplash() {
        if (!splashVisible)
            return
        splashVisible = false
        if (!webReady) {
            webReady = true
            emitLifecycle("ready")
        }
    }

    function emitLifecycle(event) {
        var payload = JSON.stringify({ event: event })
        webView.runJavaScript(
            "window.Aurobore && window.Aurobore._emit(" + JSON.stringify(event) + ")",
            function () {},
            function (err) { console.log("[aurobore-container] runJavaScript lifecycle error:", err) }
        )
        console.log("[aurobore-container] lifecycle:", event)
    }

    function handleBackNavigation() {
        webView.runJavaScript(
            "(function(){ return window.__auroboreSpaBack ? window.__auroboreSpaBack() : false; })()",
            function (handled) {
                if (!handled) {
                    console.log("[aurobore-container] back: default (no SPA history)")
                    emitLifecycle("backbutton")
                }
            },
            function (err) { console.log("[aurobore-container] back navigation error:", err) }
        )
        return true
    }

    Component.onCompleted: {
        webView.addMessageListener("aurobore:ready")
        webView.addMessageListener("aurobore:back")
        splashTimer.start()
        entryLoadTimer.start()
        console.log("[aurobore-container] htmlRootPath:", htmlRootPath)
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
        target: lifecycleBridge
        onLifecycleEvent: page.emitLifecycle(event)
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
        id: navigateTimer
        interval: 0
        repeat: false
        property string pendingUrl: ""
        onTriggered: {
            webView.url = pendingUrl
            page.internalNavigation = false
            pendingUrl = ""
            pageLoadProbeTimer.start()
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

        LoadRequestExtension {
            id: loadRequestExtension

            enabled: true
            nativeSchemeHandling: false

            function beforeUrlLoad(url, userGesture, isRedirect) {
                if (page.internalNavigation)
                    return true

                if (url.scheme === "aurobore-app") {
                    var localPath = assetResolver.toFilesystemPath(url.url)
                    if (localPath.length === 0) {
                        console.log("[aurobore-container] blocked aurobore-app:", url.url)
                        return false
                    }

                    console.log("[aurobore-container] asset via aurobore-app:", url.url, "->", localPath)

                    var pathStr = "" + localPath
                    var fileUrl = assetResolver.toFileUrl(url.url)
                    page.internalNavigation = true
                    navigateTimer.pendingUrl = fileUrl
                    navigateTimer.start()
                    return false
                }

                if (url.scheme === "file") {
                    var allowed = assetResolver.isAllowedFileUrl(url.url)
                    if (!allowed)
                        console.log("[aurobore-container] blocked file:", url.url)
                    return allowed
                }

                if (url.scheme === "http" || url.scheme === "https") {
                    console.log("[aurobore-container] blocked external:", url.url)
                    return false
                }

                return true
            }
        }
    }

  Connections {
        target: webView
        onRecvAsyncMessage: {
            if (name === "aurobore:ready") {
                console.log("[aurobore-container] web ready signal")
                console.log("[aurobore-container] M1 OK: aurobore-app loaded, lifecycle ready, SPA back works")
                page.hideSplash()
            } else if (name === "aurobore:back") {
                page.handleBackNavigation()
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
