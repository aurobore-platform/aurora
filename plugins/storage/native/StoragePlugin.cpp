#include "StoragePlugin.h"

#include "PluginRegistry.h"
#include <QtCore/QVariantMap>

StoragePlugin::StoragePlugin(BridgeRouter *bridgeRouter, QObject *parent)
    : IPlugin(bridgeRouter, parent)
{
}

QString StoragePlugin::displayName() const
{
    return QStringLiteral("Storage");
}

QString StoragePlugin::readKey(const QVariant &args) const
{
    if (args.type() == QVariant::Map) {
        return args.toMap().value(QStringLiteral("key")).toString();
    }
    return QString();
}

QVariant StoragePlugin::invoke(const QString &method, const QVariant &args,
                               const QString &id, bool isStream)
{
    Q_UNUSED(id);
    Q_UNUSED(isStream);

    const QString key = readKey(args);

    if (method == QStringLiteral("get")) {
        if (key.isEmpty()) {
            return makeError(QStringLiteral("STORAGE_INVALID_ARGS"),
                             QStringLiteral("key required"));
        }
        QVariantMap result;
        result.insert(QStringLiteral("value"), m_store.value(key));
        return result;
    }

    if (method == QStringLiteral("set")) {
        if (key.isEmpty()) {
            return makeError(QStringLiteral("STORAGE_INVALID_ARGS"),
                             QStringLiteral("key required"));
        }
        const QVariantMap map = args.toMap();
        m_store.insert(key, map.value(QStringLiteral("value")).toString());
        return QVariant(true);
    }

    if (method == QStringLiteral("remove")) {
        if (key.isEmpty()) {
            return makeError(QStringLiteral("STORAGE_INVALID_ARGS"),
                             QStringLiteral("key required"));
        }
        m_store.remove(key);
        return QVariant(true);
    }

    if (method == QStringLiteral("keys")) {
        QVariantMap result;
        result.insert(QStringLiteral("keys"), QVariant::fromValue(m_store.keys()));
        return result;
    }

    if (method == QStringLiteral("clear")) {
        m_store.clear();
        return QVariant(true);
    }

    return makeMethodNotFound(method);
}

IPlugin *createStoragePlugin(BridgeRouter *router)
{
    return new StoragePlugin(router);
}
