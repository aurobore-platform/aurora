#ifndef AUROBORE_GEOLOCATION_PLUGIN_H
#define AUROBORE_GEOLOCATION_PLUGIN_H

#include "IPlugin.h"

class GeolocationPlugin : public IPlugin
{
    Q_OBJECT

public:
    explicit GeolocationPlugin(BridgeRouter *bridgeRouter, QObject *parent = nullptr);

    QString displayName() const override;

    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;

    void cancel(const QString &id) override;
};

#endif
