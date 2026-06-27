#include "NetworkPlugin.h"

#include "BridgeRouter.h"
#include "PluginRegistry.h"

#include <QtCore/QVariantMap>

NetworkPlugin::NetworkPlugin(BridgeRouter *bridgeRouter, QObject *parent)
    : IPlugin(bridgeRouter, parent)
{
    m_pollTimer.setInterval(3000);
    connect(&m_pollTimer, &QTimer::timeout, this, &NetworkPlugin::emitStatusChange);
    connect(&m_manager, &QNetworkConfigurationManager::onlineStateChanged,
            this, &NetworkPlugin::emitStatusChange);
    m_lastOnline = m_manager.isOnline();
    m_pollTimer.start();
}

QString NetworkPlugin::displayName() const
{
    return QStringLiteral("Network");
}

QVariantMap NetworkPlugin::currentStatus() const
{
    QVariantMap status;
    status.insert(QStringLiteral("online"), m_manager.isOnline());
    status.insert(QStringLiteral("connectionType"),
                  m_manager.isOnline() ? QStringLiteral("unknown") : QStringLiteral("none"));
    return status;
}

void NetworkPlugin::emitStatusChange()
{
    const bool online = m_manager.isOnline();
    if (online == m_lastOnline)
        return;
    m_lastOnline = online;
    router()->emitEvent(QStringLiteral("network:change"), currentStatus());
}

QVariant NetworkPlugin::invoke(const QString &method, const QVariant &args,
                               const QString &id, bool isStream)
{
    Q_UNUSED(args);
    Q_UNUSED(id);
    Q_UNUSED(isStream);

    if (method == QStringLiteral("getStatus")) {
        return currentStatus();
    }

    return makeMethodNotFound(method);
}

IPlugin *createNetworkPlugin(BridgeRouter *router)
{
    return new NetworkPlugin(router);
}
