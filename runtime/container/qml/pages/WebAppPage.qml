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

    function chromeStylesheetHref() {
        if (assetServerOrigin && assetServerOrigin.length > 0)
            return assetServerOrigin + "/css/aurobore-chrome.css"
        return "css/aurobore-chrome.css"
    }

    function injectChromeStylesheet() {
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
        return false
    }

    Keys.onReleased: {
        if (event.key === Qt.Key_Back) {
            event.accepted = true
            console.log("[aurobore-container] A2 back OK: hardware Key_Back")
            handleBackNavigation()
        }
    }

    onOrientationChanged: injectInsets()
    onWidthChanged: injectInsets()
    onHeightChanged: injectInsets()

    Component.onCompleted: {
        webView.addMessageListener("aurobore:bridge")
        webView.addMessageListener("aurobore:ready")
        webView.addMessageListener("aurobore:back")
        webView.addMessageListener("aurobore:m2-ok")
        webView.addMessageListener("aurobore:m3-ok")
        webView.addMessageListener("aurobore:a2-ok")
        webView.addMessageListener("aurobore:keyboard-inset")
        bridgeRouter.trustedOrigin = assetServerOrigin && assetServerOrigin.length > 0
        injectChromeStylesheet()
        injectViewportMeta()
        injectKeyboardViewportListener()
        injectInsets()
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
            if (loading) {
                page.injectChromeStylesheet()
                page.injectViewportMeta()
                page.injectKeyboardViewportListener()
                page.injectInsets()
            }
            if (!loading && assetServerOrigin && assetServerOrigin.length > 0
                    && webView.url.indexOf(assetServerOrigin) === 0) {
                page.injectViewportMeta()
                page.injectKeyboardViewportListener()
                page.injectInsets()
                pageLoadProbeTimer.start()
            }
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
                deepLinkHandler.deliverPending()
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
                if (bottom !== keyboardInset) {
                    var wasClosed = keyboardInset === 0
                    keyboardInset = bottom
                    injectInsets()
                    if (wasClosed && bottom > 0) {
                        webView.runJavaScript(
                            "document.activeElement && document.activeElement.scrollIntoView" +
                            "({block:'nearest',behavior:'smooth'})"
                        )
                    }
                    if (bottom > 0)
                        console.log("[aurobore-container] A2 keyboard OK: bottom inset=" + bottom)
                }
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
