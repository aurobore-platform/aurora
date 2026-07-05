#include "WebViewPlugin.h"

#include "WebViewAuthBridge.h"
#include "WebViewCookieBridge.h"

WebViewPlugin::WebViewPlugin(BridgeRouter *router, WebViewAuthBridge *authBridge,
                             WebViewCookieBridge *cookieBridge, QObject *parent)
    : IPlugin(router, parent)
    , m_authBridge(authBridge)
    , m_cookieBridge(cookieBridge)
{
}

QString WebViewPlugin::displayName() const
{
    return QStringLiteral("WebView");
}

PluginDescriptor WebViewPlugin::descriptor()
{
    PluginDescriptor desc;
    desc.display = QStringLiteral("WebView");
    desc.name = QStringLiteral("webview");
    desc.version = QStringLiteral("1.0.0");
    desc.bridgeProtocol = 1;
    desc.methods = QStringList{
        QStringLiteral("respondAuth"),
        QStringLiteral("cancelAuth"),
        QStringLiteral("setCookie"),
        QStringLiteral("clearCookies"),
    };
    desc.events = QStringList{
        QStringLiteral("webview:httpAuth"),
        QStringLiteral("webview:httpError"),
        QStringLiteral("webview:loadError"),
    };
    return desc;
}

QVariant WebViewPlugin::invoke(const QString &method, const QVariant &args,
                               const QString &id, bool isStream)
{
    Q_UNUSED(isStream);

    const QVariantMap argsMap = args.toMap();
    QVariantMap ok;
    ok.insert(QStringLiteral("ok"), true);

    if (method == QStringLiteral("respondAuth")) {
        if (!m_authBridge) {
            return makeError(QStringLiteral("RUNTIME_PLUGIN_ERROR"),
                             QStringLiteral("WebView auth bridge unavailable"));
        }
        const QString requestId = argsMap.value(QStringLiteral("requestId")).toString();
        const QString username = argsMap.value(QStringLiteral("username")).toString();
        const QString password = argsMap.value(QStringLiteral("password")).toString();
        if (!m_authBridge->provideAuth(requestId, username, password)) {
            return makeError(QStringLiteral("WEBVIEW_AUTH_INVALID"),
                             QStringLiteral("No pending HTTP auth request or requestId mismatch"));
        }
        return ok;
    }

    if (method == QStringLiteral("cancelAuth")) {
        if (!m_authBridge) {
            return makeError(QStringLiteral("RUNTIME_PLUGIN_ERROR"),
                             QStringLiteral("WebView auth bridge unavailable"));
        }
        const QString requestId = argsMap.value(QStringLiteral("requestId")).toString();
        if (!m_authBridge->cancelAuth(requestId)) {
            return makeError(QStringLiteral("WEBVIEW_AUTH_INVALID"),
                             QStringLiteral("No pending HTTP auth request or requestId mismatch"));
        }
        return ok;
    }

    if (method == QStringLiteral("setCookie")) {
        if (!m_cookieBridge) {
            return makeError(QStringLiteral("WEBVIEW_COOKIE_UNAVAILABLE"),
                             QStringLiteral("WebView cookie bridge unavailable"));
        }
        const QString domain = argsMap.value(QStringLiteral("domain")).toString();
        const QString path = argsMap.value(QStringLiteral("path")).toString();
        const QString name = argsMap.value(QStringLiteral("name")).toString();
        const QString value = argsMap.value(QStringLiteral("value")).toString();
        if (domain.isEmpty() || path.isEmpty() || name.isEmpty()) {
            return makeError(QStringLiteral("WEBVIEW_COOKIE_INVALID"),
                             QStringLiteral("domain, path, and name are required"));
        }
        if (!m_cookieBridge->requestSetCookie(domain, path, name, value, id)) {
            return makeError(QStringLiteral("WEBVIEW_COOKIE_INVALID"),
                             QStringLiteral("Cookie rejected (domain not whitelisted or CookieManager unavailable)"));
        }
        return QVariant();
    }

    if (method == QStringLiteral("clearCookies")) {
        if (!m_cookieBridge) {
            return makeError(QStringLiteral("WEBVIEW_COOKIE_UNAVAILABLE"),
                             QStringLiteral("WebView cookie bridge unavailable"));
        }
        const bool success = m_cookieBridge->clearCookies();
        ok.insert(QStringLiteral("success"), success);
        return ok;
    }

    return makeMethodNotFound(method);
}

IPlugin *createWebViewPlugin(BridgeRouter *router, WebViewAuthBridge *authBridge,
                             WebViewCookieBridge *cookieBridge)
{
    return new WebViewPlugin(router, authBridge, cookieBridge);
}
