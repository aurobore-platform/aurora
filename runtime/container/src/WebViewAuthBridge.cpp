#include "WebViewAuthBridge.h"

#include "BridgeRouter.h"

#include <QtCore/QDebug>
#include <QtCore/QUrl>
#include <QtCore/QUuid>
#include <QtCore/QVariantMap>
#include <QtQml/QQmlEngine>

#ifdef AUROBORE_WEBVIEW_HAS_HTTP_AUTH
#include <aurorawebview/authhandler.h>
#include <aurorawebview/httpauthrequest.h>

namespace AW = Aurora::WebView;
#endif

struct WebViewAuthBridge::Private
{
    BridgeRouter *router = nullptr;
    QStringList allowedOrigins;
    QString pendingRequestId;

#ifdef AUROBORE_WEBVIEW_HAS_HTTP_AUTH
    AW::HttpAuthRequest pendingRequest;
    bool hasPendingRequest = false;
    QMetaObject::Connection authConnection;
#endif

    bool isHostAllowed(const QString &host) const
    {
        if (host.isEmpty())
            return false;

        for (const QString &origin : allowedOrigins) {
            if (origin.isEmpty())
                continue;
            const QUrl url(origin);
            const QString originHost = url.isValid() && !url.host().isEmpty()
                ? url.host()
                : origin;
            if (host.compare(originHost, Qt::CaseInsensitive) == 0)
                return true;
            if (origin.contains(host, Qt::CaseInsensitive))
                return true;
        }
        return false;
    }
};

WebViewAuthBridge::WebViewAuthBridge(BridgeRouter *router, QObject *parent)
    : QObject(parent)
    , d(new Private)
{
    d->router = router;
#ifndef AUROBORE_WEBVIEW_HAS_HTTP_AUTH
    qInfo("[aurobore-container] WebViewAuthBridge: HTTP auth API unavailable in this build");
#endif
}

WebViewAuthBridge::~WebViewAuthBridge()
{
#ifdef AUROBORE_WEBVIEW_HAS_HTTP_AUTH
    if (d->authConnection)
        QObject::disconnect(d->authConnection);
    if (d->hasPendingRequest && d->pendingRequest.isValid())
        d->pendingRequest.cancel();
#endif
    delete d;
}

void WebViewAuthBridge::initialize(QQmlEngine *engine)
{
#ifdef AUROBORE_WEBVIEW_HAS_HTTP_AUTH
    if (!engine) {
        qWarning("[aurobore-container] WebViewAuthBridge: QQmlEngine unavailable");
        return;
    }
    if (d->authConnection) {
        QObject::disconnect(d->authConnection);
        d->authConnection = QMetaObject::Connection();
    }

    const QSharedPointer<AW::AuthHandler> authHandler =
        AW::AuthHandler::GetInstance(engine, engine);
    if (!authHandler) {
        qWarning("[aurobore-container] WebViewAuthBridge: AuthHandler unavailable");
        return;
    }

    d->authConnection = QObject::connect(
        authHandler.data(), &AW::AuthHandler::httpAuthRequested, this,
        [this](AW::HttpAuthRequest request) {
            if (d->hasPendingRequest && d->pendingRequest.isValid())
                d->pendingRequest.cancel();

            const QString host = request.host();
            if (!d->isHostAllowed(host)) {
                qInfo("[aurobore-container] HTTP auth cancelled (host not in whitelist): %s",
                      qPrintable(host));
                request.cancel();
                return;
            }

            d->pendingRequest = request;
            d->hasPendingRequest = true;
            d->pendingRequestId = QUuid::createUuid().toString().mid(1, 36);

            const QString realm = request.realm();
            qInfo("[aurobore-container] HTTP auth requested: host=%s realm=%s",
                  qPrintable(host), qPrintable(realm));

            if (d->router) {
                QVariantMap payload;
                payload.insert(QStringLiteral("requestId"), d->pendingRequestId);
                payload.insert(QStringLiteral("host"), host);
                payload.insert(QStringLiteral("realm"), realm);
                d->router->emitEvent(QStringLiteral("webview:httpAuth"), payload);
            }

            emit authRequested(d->pendingRequestId, host, realm);
        });
    qInfo("[aurobore-container] WebViewAuthBridge: AuthHandler connected");
#else
    Q_UNUSED(engine);
#endif
}

void WebViewAuthBridge::setAllowedOrigins(const QStringList &origins)
{
    d->allowedOrigins = origins;
}

bool WebViewAuthBridge::provideAuth(const QString &requestId, const QString &username,
                                      const QString &password)
{
#ifdef AUROBORE_WEBVIEW_HAS_HTTP_AUTH
    if (!d->hasPendingRequest || !d->pendingRequest.isValid())
        return false;
    if (!requestId.isEmpty() && requestId != d->pendingRequestId)
        return false;

    d->pendingRequest.authenticate(username, password);
    d->hasPendingRequest = false;
    d->pendingRequestId.clear();
    emit authResolved();
    qInfo("[aurobore-container] HTTP auth credentials submitted");
    return true;
#else
    Q_UNUSED(requestId);
    Q_UNUSED(username);
    Q_UNUSED(password);
    return false;
#endif
}

bool WebViewAuthBridge::cancelAuth(const QString &requestId)
{
#ifdef AUROBORE_WEBVIEW_HAS_HTTP_AUTH
    if (!d->hasPendingRequest || !d->pendingRequest.isValid())
        return false;
    if (!requestId.isEmpty() && requestId != d->pendingRequestId)
        return false;

    d->pendingRequest.cancel();
    d->hasPendingRequest = false;
    d->pendingRequestId.clear();
    emit authResolved();
    qInfo("[aurobore-container] HTTP auth cancelled by user/app");
    return true;
#else
    Q_UNUSED(requestId);
    return false;
#endif
}
