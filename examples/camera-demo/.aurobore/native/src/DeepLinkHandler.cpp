#include "DeepLinkHandler.h"

#include "BridgeRouter.h"

#include <QtCore/QDebug>
#include <QtCore/QVariantMap>

DeepLinkHandler::DeepLinkHandler(BridgeRouter *router, QObject *parent)
    : QObject(parent)
    , m_router(router)
{
}

void DeepLinkHandler::setSchemes(const QStringList &schemes)
{
    m_schemes = schemes;
}

bool DeepLinkHandler::matchesScheme(const QString &url) const
{
    for (const QString &scheme : m_schemes) {
        if (url.startsWith(scheme + QStringLiteral("://")))
            return true;
    }
    return false;
}

void DeepLinkHandler::captureFromArguments(const QStringList &arguments)
{
    for (const QString &arg : arguments) {
        if (matchesScheme(arg)) {
            queueUrl(arg);
            return;
        }
    }
}

void DeepLinkHandler::queueUrl(const QString &url)
{
    m_pendingUrl = url;
    qInfo("[aurobore-container] deep link captured: %s", qPrintable(url));
    tryDeliver();
}

void DeepLinkHandler::setWebReady(bool ready)
{
    m_webReady = ready;
    tryDeliver();
}

void DeepLinkHandler::deliverPending()
{
    setWebReady(true);
}

void DeepLinkHandler::tryDeliver()
{
    if (!m_webReady || m_pendingUrl.isEmpty() || !m_router)
        return;

    QVariantMap payload;
    payload.insert(QStringLiteral("url"), m_pendingUrl);
    m_router->emitEvent(QStringLiteral("deeplink"), payload);
    qInfo("[aurobore-container] A2 deeplink delivered: %s", qPrintable(m_pendingUrl));
    m_pendingUrl.clear();
}
