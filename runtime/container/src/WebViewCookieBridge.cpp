#include "WebViewCookieBridge.h"

#include "BridgeRouter.h"

#include <QtCore/QDebug>
#include <QtCore/QUrl>
#include <QtCore/QVariantMap>
#include <QtQml/QQmlEngine>

#ifdef AUROBORE_WEBVIEW_HAS_COOKIE_MANAGER
#include <aurorawebview/cookies/cookiemanager.h>

namespace AW = Aurora::WebView;
#endif

struct WebViewCookieBridge::Private
{
    BridgeRouter *router = nullptr;
    QStringList allowedOrigins;
#ifdef AUROBORE_WEBVIEW_HAS_COOKIE_MANAGER
    QSharedPointer<AW::CookieManager> cookieManager;
    QMetaObject::Connection cookiesDeletedConnection;
#endif

    bool isDomainAllowed(const QString &domain) const
    {
        if (domain.isEmpty())
            return false;

        for (const QString &origin : allowedOrigins) {
            if (origin.isEmpty())
                continue;
            const QUrl url(origin);
            const QString originHost = url.isValid() && !url.host().isEmpty()
                ? url.host()
                : origin;
            if (domain.compare(originHost, Qt::CaseInsensitive) == 0)
                return true;
            if (origin.contains(domain, Qt::CaseInsensitive))
                return true;
        }
        return false;
    }
};

WebViewCookieBridge::WebViewCookieBridge(BridgeRouter *router, QObject *parent)
    : QObject(parent)
    , d(new Private)
{
    d->router = router;
#ifndef AUROBORE_WEBVIEW_HAS_COOKIE_MANAGER
    qInfo("[aurobore-container] WebViewCookieBridge: CookieManager API unavailable in this build");
#endif
}

WebViewCookieBridge::~WebViewCookieBridge()
{
#ifdef AUROBORE_WEBVIEW_HAS_COOKIE_MANAGER
    if (d->cookiesDeletedConnection)
        QObject::disconnect(d->cookiesDeletedConnection);
#endif
    delete d;
}

void WebViewCookieBridge::initialize(QQmlEngine *engine)
{
#ifdef AUROBORE_WEBVIEW_HAS_COOKIE_MANAGER
    if (!engine) {
        qWarning("[aurobore-container] WebViewCookieBridge: QQmlEngine unavailable");
        return;
    }
    d->cookieManager = AW::CookieManager::GetInstance(engine, engine);
    if (!d->cookieManager) {
        qWarning("[aurobore-container] WebViewCookieBridge: CookieManager unavailable");
        return;
    }
    qInfo("[aurobore-container] WebViewCookieBridge: CookieManager connected");
#else
    Q_UNUSED(engine);
#endif
}

void WebViewCookieBridge::setAllowedOrigins(const QStringList &origins)
{
    d->allowedOrigins = origins;
}

bool WebViewCookieBridge::validateCookieArgs(const QString &domain, const QString &path,
                                               const QString &name,
                                               QString *errorMessage) const
{
    if (domain.isEmpty()) {
        if (errorMessage)
            *errorMessage = QStringLiteral("domain is required");
        return false;
    }
    if (path.isEmpty()) {
        if (errorMessage)
            *errorMessage = QStringLiteral("path is required");
        return false;
    }
    if (name.isEmpty()) {
        if (errorMessage)
            *errorMessage = QStringLiteral("name is required");
        return false;
    }
    if (!d->isDomainAllowed(domain)) {
        if (errorMessage)
            *errorMessage = QStringLiteral("domain is not in web.allowedOrigins");
        return false;
    }
    return true;
}

bool WebViewCookieBridge::isDomainAllowed(const QString &domain) const
{
    return d->isDomainAllowed(domain);
}

void WebViewCookieBridge::finishSetCookie(const QString &invokeId, bool success)
{
    if (!invokeId.isEmpty() && d->router) {
        QVariantMap result;
        result.insert(QStringLiteral("ok"), true);
        result.insert(QStringLiteral("success"), success);
        d->router->emitOutbound(d->router->makeOkResponse(invokeId, result));
    }
    emit cookieSet(success);
}

bool WebViewCookieBridge::requestSetCookie(const QString &domain, const QString &path,
                                           const QString &name, const QString &value,
                                           const QString &invokeId)
{
    QString errorMessage;
    if (!validateCookieArgs(domain, path, name, &errorMessage)) {
        qInfo("[aurobore-container] setCookie rejected: %s", qPrintable(errorMessage));
        return false;
    }

    qInfo("[aurobore-container] setCookie requested: domain=%s name=%s",
          qPrintable(domain), qPrintable(name));
    emit setCookieRequested(domain, path, name, value, invokeId);
    return true;
}

bool WebViewCookieBridge::clearCookies()
{
#ifdef AUROBORE_WEBVIEW_HAS_COOKIE_MANAGER
    if (!d->cookieManager) {
        qWarning("[aurobore-container] clearCookies: CookieManager unavailable");
        return false;
    }
    const bool accepted = d->cookieManager->deleteCookies(QString(), QString());
    qInfo("[aurobore-container] clearCookies: accepted=%d", accepted ? 1 : 0);
    return accepted;
#else
    return false;
#endif
}

void WebViewCookieBridge::setCookie(const QString &domain, const QString &path,
                                      const QString &name, const QString &value)
{
    if (!requestSetCookie(domain, path, name, value, QString()))
        emit cookieSet(false);
}

bool WebViewCookieBridge::clearAllCookies()
{
    return clearCookies();
}

void WebViewCookieBridge::completeSetCookie(const QString &invokeId, bool success)
{
    if (success)
        qInfo("[aurobore-container] W5 cookie test: setCookie OK");
    finishSetCookie(invokeId, success);
}
