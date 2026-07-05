.pragma library

function statusBarHeightPx(themeStatusBarHeight) {
    var h = themeStatusBarHeight || 0
    return h > 0 ? h : 32
}

function computeCutoutInsets(orientation, safeZoneRect, fallbackTopPx) {
    var result = { top: 0, right: 0, bottom: 0, left: 0 }

    if (safeZoneRect) {
        switch (orientation) {
        case 1: // Orientation.Portrait
            result.top = Math.max(safeZoneRect.insets.top, safeZoneRect.appInsets.top)
            result.left = safeZoneRect.insets.left
            result.right = safeZoneRect.insets.right
            break
        case 2: // Orientation.Landscape
            result.top = Math.max(safeZoneRect.insets.left, safeZoneRect.appInsets.top)
            result.left = safeZoneRect.insets.top
            result.right = safeZoneRect.insets.bottom
            break
        case 4: // Orientation.PortraitInverted
            result.top = Math.max(safeZoneRect.insets.bottom, safeZoneRect.appInsets.top)
            result.left = safeZoneRect.insets.right
            result.right = safeZoneRect.insets.left
            break
        case 8: // Orientation.LandscapeInverted
            result.top = Math.max(safeZoneRect.insets.right, safeZoneRect.appInsets.top)
            result.left = safeZoneRect.insets.bottom
            result.right = safeZoneRect.insets.top
            break
        }
    } else {
        result.top = fallbackTopPx
    }

    if (result.top <= 0)
        result.top = fallbackTopPx

    return result
}

function screenAxisHeight(orientation, screenWidth, screenHeight) {
    switch (orientation) {
    case 1: // Orientation.Portrait
    case 4: // Orientation.PortraitInverted
        return screenHeight
    case 2: // Orientation.Landscape
    case 8: // Orientation.LandscapeInverted
        return screenWidth
    }
    return screenHeight
}

function computeWebCssScale(qmlAxisHeight, webInnerHeight, devicePixelRatio) {
    if (qmlAxisHeight > 0 && webInnerHeight > 0)
        return webInnerHeight / qmlAxisHeight
    if (devicePixelRatio > 0)
        return 1 / devicePixelRatio
    return 1
}

function qmlPxToWebCss(qmlPx, scale) {
    return Math.round(qmlPx * scale)
}

function injectChromeStylesheet(webView, href) {
    if (!webView)
        return
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

function injectKeyboardViewportListener(webView) {
    if (!webView)
        return
    webView.runJavaScript(
        "(function(){ if(window.__auroboreKeyboardInsets) return;" +
        "window.__auroboreKeyboardInsets=true;" +
        "if(navigator.virtualKeyboard) navigator.virtualKeyboard.overlaysContent=true;" +
        "function apply(){ if(!window.visualViewport) return;" +
        "var v=window.visualViewport;" +
        "var bottom=Math.max(0, Math.round(window.innerHeight-v.height-v.offsetTop));" +
        "if(typeof sendAsyncMessage==='function') sendAsyncMessage('aurobore:keyboard-inset',bottom);" +
        "}" +
        "if(window.visualViewport){" +
        "window.visualViewport.addEventListener('resize',apply);" +
        "window.visualViewport.addEventListener('scroll',apply); apply(); }" +
        "})();",
        function () {},
        function (err) { console.log("[aurobore-container] keyboard viewport listener error:", err) }
    )
}

function injectViewportMeta(webView) {
    if (!webView)
        return
    webView.runJavaScript(
        "(function(){ if(navigator.virtualKeyboard) navigator.virtualKeyboard.overlaysContent=true;" +
        "var m=document.querySelector('meta[name=viewport]');" +
        "if(!m){ m=document.createElement('meta'); m.name='viewport'; document.head.appendChild(m); }" +
        "var content=m.getAttribute('content')||'';" +
        "if(content.indexOf('viewport-fit=cover')<0){" +
        "m.setAttribute('content', content ? content+', viewport-fit=cover' : 'width=device-width, initial-scale=1.0, viewport-fit=cover');" +
        "}})();",
        function () {},
        function (err) { console.log("[aurobore-container] viewport meta error:", err) }
    )
}

function injectInsets(webView, top, right, bottom, left) {
    if (!webView)
        return
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
}
