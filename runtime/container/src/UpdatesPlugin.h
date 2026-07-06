#ifndef AUROBORE_UPDATES_PLUGIN_H
#define AUROBORE_UPDATES_PLUGIN_H

#include "IPlugin.h"
#include "PluginDescriptor.h"

class UpdateManager;

class UpdatesPlugin : public IPlugin
{
    Q_OBJECT

public:
    UpdatesPlugin(BridgeRouter *router, UpdateManager *updateManager, QObject *parent = nullptr);

    QString displayName() const override;
    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;

    static PluginDescriptor descriptor();

private:
    UpdateManager *m_updateManager = nullptr;
};

IPlugin *createUpdatesPlugin(BridgeRouter *router, UpdateManager *updateManager);

#endif
