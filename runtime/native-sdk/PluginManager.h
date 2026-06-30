#ifndef AUROBORE_PLUGIN_MANAGER_H
#define AUROBORE_PLUGIN_MANAGER_H

#include "PluginDescriptor.h"

#include <QHash>
#include <QObject>
#include <QStringList>
#include <QVariant>

class BridgeRouter;
class IPlugin;

class PluginManager : public QObject
{
    Q_OBJECT

public:
    explicit PluginManager(BridgeRouter *router, QObject *parent = nullptr);
    ~PluginManager() override;

    void setGrantedPermissions(const QStringList &permissions);
    bool loadFromRegistry();

    QVariant dispatchInvoke(const QString &plugin, const QString &method,
                            const QVariant &args, const QString &id, bool isStream,
                            const QVariantMap &meta = QVariantMap());

    void dispatchCancel(const QString &plugin, const QString &id);
    void dispatchCancelById(const QString &id);

    void registerStream(const QString &subscriptionId, const QString &plugin, int maxFps);
    void unregisterStream(const QString &subscriptionId);
    int streamMaxFps(const QString &subscriptionId) const;

    QStringList registeredPlugins() const;

private:
    bool hasRequiredPermissions(const PluginDescriptor &descriptor) const;
    bool isMethodAllowed(const PluginDescriptor &descriptor, const QString &method) const;
    bool validateScopes(const PluginDescriptor &descriptor, const QVariant &args,
                        QString *violatedScope, QString *message) const;
    QVariant permissionDenied(const QString &plugin, const QString &id) const;
    QVariant scopeDenied(const QString &plugin, const QString &id, const QString &scope,
                         const QString &message) const;

    BridgeRouter *m_router = nullptr;
    QStringList m_grantedPermissions;
    QHash<QString, PluginDescriptor> m_descriptors;
    QHash<QString, IPlugin *> m_plugins;
    QHash<QString, QString> m_streamOwners;
    QHash<QString, int> m_streamMaxFps;
};

#endif
