#ifndef AUROBORE_DEVICE_PLUGIN_H
#define AUROBORE_DEVICE_PLUGIN_H

#include "IPlugin.h"

class DevicePlugin : public IPlugin
{
    Q_OBJECT

public:
    explicit DevicePlugin(BridgeRouter *bridgeRouter, QObject *parent = nullptr);

    QString displayName() const override;

    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;
};

#endif
