#ifndef AUROBORE_SENSORS_PLUGIN_H
#define AUROBORE_SENSORS_PLUGIN_H

#include "IPlugin.h"

class SensorsPlugin : public IPlugin
{
    Q_OBJECT

public:
    explicit SensorsPlugin(BridgeRouter *bridgeRouter, QObject *parent = nullptr);

    QString displayName() const override;

    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;

    void cancel(const QString &id) override;
};

#endif
