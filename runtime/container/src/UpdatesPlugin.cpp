#include "UpdatesPlugin.h"

#include "UpdateManager.h"

UpdatesPlugin::UpdatesPlugin(BridgeRouter *router, UpdateManager *updateManager, QObject *parent)
    : IPlugin(router, parent)
    , m_updateManager(updateManager)
{
}

QString UpdatesPlugin::displayName() const
{
    return QStringLiteral("Updates");
}

PluginDescriptor UpdatesPlugin::descriptor()
{
    PluginDescriptor desc;
    desc.display = QStringLiteral("Updates");
    desc.name = QStringLiteral("updates");
    desc.version = QStringLiteral("1.0.0");
    desc.bridgeProtocol = 1;
    desc.methods = QStringList{
        QStringLiteral("check"),
        QStringLiteral("apply"),
        QStringLiteral("rollback"),
        QStringLiteral("getStatus"),
    };
    desc.events = QStringList{
        QStringLiteral("update:available"),
        QStringLiteral("update:ready"),
        QStringLiteral("update:applied"),
        QStringLiteral("update:error"),
    };
    return desc;
}

QVariant UpdatesPlugin::invoke(const QString &method, const QVariant &args,
                               const QString &id, bool isStream)
{
    Q_UNUSED(args);
    Q_UNUSED(id);
    Q_UNUSED(isStream);

    if (!m_updateManager) {
        return makeError(QStringLiteral("RUNTIME_PLUGIN_ERROR"),
                         QStringLiteral("Update manager unavailable"));
    }

    QVariantMap ok;
    ok.insert(QStringLiteral("ok"), true);

    if (method == QStringLiteral("check")) {
        m_updateManager->checkNow();
        return ok;
    }
    if (method == QStringLiteral("apply")) {
        m_updateManager->applyPending();
        return ok;
    }
    if (method == QStringLiteral("rollback")) {
        m_updateManager->rollbackNow();
        return ok;
    }
    if (method == QStringLiteral("getStatus")) {
        return m_updateManager->buildStatus();
    }

    return makeMethodNotFound(method);
}

IPlugin *createUpdatesPlugin(BridgeRouter *router, UpdateManager *updateManager)
{
    return new UpdatesPlugin(router, updateManager);
}
