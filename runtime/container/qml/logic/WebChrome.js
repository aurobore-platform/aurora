.pragma library

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

function injectViewportMeta(webView) {
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
