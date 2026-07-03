#include "SharePlugin.h"

#include "BridgeRouter.h"
#include "PluginRegistry.h"
#include "ResourceRef.h"
#include "ScopeValidator.h"
#include "ShareBridge.h"

#include <QtCore/QFileInfo>
#include <QtCore/QMimeDatabase>
#include <QtCore/QUrl>
#include <QtCore/QVariantMap>

namespace {

ShareBridge *s_shareBridge = nullptr;

QString stringArg(const QVariantMap &args, const char *key)
{
    return args.value(QString::fromLatin1(key)).toString();
}

} // namespace

void SharePlugin::setShareBridge(ShareBridge *bridge)
{
    s_shareBridge = bridge;
}

SharePlugin::SharePlugin(BridgeRouter *bridgeRouter, QObject *parent)
    : IPlugin(bridgeRouter, parent)
{
    if (!s_shareBridge)
        return;

    connect(s_shareBridge, &ShareBridge::shareCompleted, this, [this]() {
        finishWithSuccess();
    });
    connect(s_shareBridge, &ShareBridge::userCancelled, this, [this]() {
        finishWithError(QStringLiteral("SHARE_CANCELLED"),
                        QStringLiteral("user cancelled"));
    });
    connect(s_shareBridge, &ShareBridge::shareUnavailable, this, [this]() {
        finishWithError(QStringLiteral("SHARE_UNAVAILABLE"),
                        QStringLiteral("share sheet not available"));
    });
}

QString SharePlugin::displayName() const
{
    return QStringLiteral("Share");
}

QVariant SharePlugin::invoke(const QString &method, const QVariant &args,
                             const QString &id, bool isStream)
{
    Q_UNUSED(isStream);

    if (method != QStringLiteral("shareText") && method != QStringLiteral("shareUrl")
        && method != QStringLiteral("shareFile")) {
        return makeMethodNotFound(method);
    }

    if (!s_shareBridge) {
        return makeError(QStringLiteral("SHARE_UNAVAILABLE"),
                         QStringLiteral("share sheet not available"));
    }

    if (!m_pendingId.isEmpty()) {
        return makeError(QStringLiteral("SHARE_UNAVAILABLE"),
                         QStringLiteral("share operation already in progress"));
    }

    const QVariantMap argMap = args.toMap();

    if (method == QStringLiteral("shareText")) {
        const QString text = stringArg(argMap, "text");
        if (text.isEmpty()) {
            return makeError(QStringLiteral("SHARE_UNAVAILABLE"),
                             QStringLiteral("text required"));
        }
        m_pendingId = id;
        m_pendingMethod = method;
        s_shareBridge->requestShareText(text, stringArg(argMap, "title"));
        return QVariant();
    }

    if (method == QStringLiteral("shareUrl")) {
        const QString url = stringArg(argMap, "url");
        if (url.isEmpty()) {
            return makeError(QStringLiteral("SHARE_UNAVAILABLE"),
                             QStringLiteral("url required"));
        }
        m_pendingId = id;
        m_pendingMethod = method;
        s_shareBridge->requestShareUrl(url, stringArg(argMap, "title"));
        return QVariant();
    }

    const QString resourceUrl = stringArg(argMap, "url");
    if (resourceUrl.isEmpty()) {
        return makeError(QStringLiteral("SHARE_UNAVAILABLE"),
                         QStringLiteral("url required"));
    }

    const QString filePath = resolveAppDataFilePath(resourceUrl);
    if (filePath.isEmpty()) {
        return makeError(QStringLiteral("SHARE_UNAVAILABLE"),
                         QStringLiteral("resource file not found"));
    }

    QString mimeType = stringArg(argMap, "mimeType");
    if (mimeType.isEmpty()) {
        QMimeDatabase db;
        mimeType = db.mimeTypeForFile(filePath).name();
    }

    m_pendingId = id;
    m_pendingMethod = method;
    s_shareBridge->requestShareFile(filePath, mimeType, stringArg(argMap, "title"));
    return QVariant();
}

void SharePlugin::cancel(const QString &id)
{
    if (m_pendingId != id || !s_shareBridge)
        return;

    s_shareBridge->dismissActive();
    finishWithError(QStringLiteral("SHARE_CANCELLED"),
                    QStringLiteral("user cancelled"));
}

void SharePlugin::clearPending()
{
    m_pendingId.clear();
    m_pendingMethod.clear();
}

void SharePlugin::finishWithSuccess()
{
    if (m_pendingId.isEmpty())
        return;

    const QString invokeId = m_pendingId;
    clearPending();
    router()->emitOutbound(router()->makeOkResponse(invokeId, QVariant()));
}

void SharePlugin::finishWithError(const QString &code, const QString &message)
{
    if (m_pendingId.isEmpty())
        return;

    const QString invokeId = m_pendingId;
    clearPending();
    router()->emitOutbound(router()->makeErrorResponse(invokeId, code, message));
}

QString SharePlugin::resolveAppDataFilePath(const QString &resourceUrl) const
{
    const QUrl url(resourceUrl);
    if (!url.isValid())
        return QString();

    const QString prefix = AuroboreResource::appDataUrlPrefix();
    if (resourceUrl.startsWith(prefix)) {
        const QString relative = resourceUrl.mid(prefix.length());
        QString errorCode;
        const QString path = ScopeValidator::resolveAppDataPath(relative, &errorCode);
        if (path.isEmpty())
            return QString();
        const QFileInfo info(path);
        if (!info.exists() || !info.isFile())
            return QString();
        return path;
    }

    if (url.scheme() == QStringLiteral("aurobore-app")) {
        QString pathPart = url.path();
        if (pathPart.startsWith(QLatin1Char('/')))
            pathPart = pathPart.mid(1);
        if (!pathPart.startsWith(QStringLiteral("app-data/")))
            return QString();
        const QString relative = pathPart.mid(QStringLiteral("app-data/").length());
        QString errorCode;
        const QString path = ScopeValidator::resolveAppDataPath(relative, &errorCode);
        if (path.isEmpty())
            return QString();
        const QFileInfo info(path);
        if (!info.exists() || !info.isFile())
            return QString();
        return path;
    }

    return QString();
}

IPlugin *createSharePlugin(BridgeRouter *router)
{
    return new SharePlugin(router);
}
