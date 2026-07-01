#include "SharePlugin.h"

#include "PluginRegistry.h"

#include <QtCore/QVariant>

SharePlugin::SharePlugin(BridgeRouter *bridgeRouter, QObject *parent)
    : IPlugin(bridgeRouter, parent)
{
}

QString SharePlugin::displayName() const
{
    return QStringLiteral("Share");
}

QVariant SharePlugin::invoke(const QString &method, const QVariant &args,
                             const QString &id, bool isStream)
{
    Q_UNUSED(args);
    Q_UNUSED(id);
    Q_UNUSED(isStream);

    if (method == QStringLiteral("shareText") || method == QStringLiteral("shareUrl")
        || method == QStringLiteral("shareFile")) {
        return makeError(QStringLiteral("SHARE_UNAVAILABLE"),
                         QStringLiteral("share sheet not available"));
    }

    return makeMethodNotFound(method);
}

IPlugin *createSharePlugin(BridgeRouter *router)
{
    return new SharePlugin(router);
}
