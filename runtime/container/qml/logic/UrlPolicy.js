.pragma library

function isAllowedAppUrl(urlString, assetServerOrigin, allowedOrigins, assetResolver) {
    if (assetServerOrigin && assetServerOrigin.length > 0
            && urlString.indexOf(assetServerOrigin) === 0) {
        return true
    }
    if (urlString.indexOf("aurobore-app://") === 0) {
        return assetResolver.isAllowedUrl(urlString)
    }
    if (allowedOrigins) {
        for (var i = 0; i < allowedOrigins.length; i++) {
            var origin = allowedOrigins[i]
            if (origin && origin.length > 0 && urlString.indexOf(origin) === 0)
                return true
        }
    }
    return false
}

function shouldEmitWebViewError(urlString, assetServerOrigin, allowedOrigins) {
    if (!urlString || urlString.indexOf("http") !== 0)
        return false
    if (assetServerOrigin && assetServerOrigin.length > 0
            && urlString.indexOf(assetServerOrigin) === 0) {
        return false
    }
    if (!allowedOrigins || allowedOrigins.length === 0)
        return false
    for (var j = 0; j < allowedOrigins.length; j++) {
        var allowedOrigin = allowedOrigins[j]
        if (allowedOrigin && allowedOrigin.length > 0 && urlString.indexOf(allowedOrigin) === 0)
            return true
    }
    return false
}
