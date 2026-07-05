// WebView instance: URL policy, chrome inject signals, bridge message listeners.
import QtQuick 2.6
import ru.auroraos.WebView 1.0
import "../logic/UrlPolicy.js" as UrlPolicy

WebView {
    id: root

    url: "about:blank"

    signal chromeInjectRequested()
    signal bundledLoadComplete()
    signal readyProbeNeeded()
    signal loadFinishedWhitelisted(string url, int statusCode)
    signal loadErrorWhitelisted(string url, int errorCode)

    TouchInput { enabled: true }
    KeyboardInput { enabled: true }

    Component.onCompleted: {
        addMessageListener("aurobore:bridge")
        addMessageListener("aurobore:ready")
        addMessageListener("aurobore:back")
        addMessageListener("aurobore:m2-ok")
        addMessageListener("aurobore:m3-ok")
        addMessageListener("aurobore:a2-ok")
        addMessageListener("aurobore:keyboard-inset")
    }

    onLoadFinished: {
        if (httpStatusCode >= 400 && httpStatusCode < 600
                && UrlPolicy.shouldEmitWebViewError(url, assetServerOrigin, allowedOrigins)) {
            loadFinishedWhitelisted(url, httpStatusCode)
        }
    }

    onLoadError: {
        if (UrlPolicy.shouldEmitWebViewError(url, assetServerOrigin, allowedOrigins))
            loadErrorWhitelisted(url, errorCode)
    }

    onLoadingChanged: {
        if (loading) {
            chromeInjectRequested()
        }
        if (!loading && assetServerOrigin && assetServerOrigin.length > 0
                && url.indexOf(assetServerOrigin) === 0) {
            bundledLoadComplete()
            readyProbeNeeded()
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
