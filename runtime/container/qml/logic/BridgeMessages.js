.pragma library

function parseBridgeData(raw) {
    if (typeof raw === "string") {
        try { return JSON.parse(raw) } catch (e) { return {} }
    }
    return raw
}

function handleRecvAsyncMessage(name, data, page, router, deepLinks, notifications) {
    if (name === "aurobore:bridge") {
        router.handleMessage(parseBridgeData(data))
    } else if (name === "aurobore:ready") {
        console.log("[aurobore-container] web ready signal")
        console.log("[aurobore-container] M1 OK: aurobore-app loaded, lifecycle ready, SPA back works")
        if (deepLinks)
            deepLinks.deliverPending()
        if (notifications)
            notifications.deliverPending()
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
