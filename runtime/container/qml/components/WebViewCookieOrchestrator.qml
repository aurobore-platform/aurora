// W+3 interim (SDK <=5.2.x): setCookie via navigate to https://<domain>/ then document.cookie.
// Brief navigation flash on invoke; no HttpOnly. Native CookieManager::setCookie in W+3b.
// See docs/aurora/webview.md section 6.3 Interim.
import QtQuick 2.6

Item {
    id: root

    property var webView
    property var pendingCookieApply: null

    function applyOnLoadFinished(urlString, httpStatusCode) {
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

    function cancelPending() {
        if (!pendingCookieApply)
            return
        if (typeof webViewCookieBridge !== "undefined" && webViewCookieBridge)
            webViewCookieBridge.completeSetCookie(pendingCookieApply.invokeId || "", false)
        pendingCookieApply = null
    }

    Connections {
        target: typeof webViewCookieBridge !== "undefined" ? webViewCookieBridge : null
        onSetCookieRequested: {
            if (!root.webView)
                return
            root.pendingCookieApply = {
                domain: domain,
                path: path,
                name: name,
                value: value,
                invokeId: invokeId || ""
            }
            console.log("[aurobore-container] setCookie: navigating to", "https://" + domain + "/")
            root.webView.url = "https://" + domain + "/"
        }
    }
}
