#include "NotificationsPlugin.h"

#include "PluginRegistry.h"

#include <QtCore/QVariant>

NotificationsPlugin::NotificationsPlugin(BridgeRouter *bridgeRouter, QObject *parent)
    : IPlugin(bridgeRouter, parent)
{
}

QString NotificationsPlugin::displayName() const
{
    return QStringLiteral("Notifications");
}

QVariant NotificationsPlugin::invoke(const QString &method, const QVariant &args,
                                     const QString &id, bool isStream)
{
    Q_UNUSED(args);
    Q_UNUSED(id);
    Q_UNUSED(isStream);

    if (method == QStringLiteral("schedule") || method == QStringLiteral("notify")
        || method == QStringLiteral("cancel") || method == QStringLiteral("cancelAll")) {
        return makeError(QStringLiteral("NOTIFICATIONS_UNAVAILABLE"),
                         QStringLiteral("notifications not available"));
    }

    return makeMethodNotFound(method);
}

IPlugin *createNotificationsPlugin(BridgeRouter *router)
{
    return new NotificationsPlugin(router);
}
