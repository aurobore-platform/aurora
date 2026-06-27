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
                            const QVariant &args, const QString &id, bool isStream);

    void dispatchCancel(const QString &plugin, const QString &id);

    QStringList registeredPlugins() const;

private:
    bool hasRequiredPermissions(const PluginDescriptor &descriptor) const;
    bool isMethodAllowed(const PluginDescriptor &descriptor, const QString &method) const;
    QVariant permissionDenied(const QString &plugin, const QString &id) const;

    BridgeRouter *m_router = nullptr;
    QStringList m_grantedPermissions;
    QHash<QString, PluginDescriptor> m_descriptors;
    QHash<QString, IPlugin *> m_plugins;
};

#endif
