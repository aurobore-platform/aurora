#ifndef AUROBORE_COVER_PLUGIN_H
#define AUROBORE_COVER_PLUGIN_H

#include "IPlugin.h"
#include "PluginDescriptor.h"

class CoverBridge;

class CoverPlugin : public IPlugin
{
    Q_OBJECT

public:
    CoverPlugin(BridgeRouter *router, CoverBridge *coverBridge, QObject *parent = nullptr);

    QString displayName() const override;
    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;

    static PluginDescriptor descriptor();

private:
    CoverBridge *m_coverBridge = nullptr;
};

IPlugin *createCoverPlugin(BridgeRouter *router, CoverBridge *coverBridge);

#endif
