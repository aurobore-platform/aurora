#ifndef AUROBORE_CAMERA_PLUGIN_H
#define AUROBORE_CAMERA_PLUGIN_H

#include "IPlugin.h"

class CameraPlugin : public IPlugin
{
    Q_OBJECT

public:
    explicit CameraPlugin(BridgeRouter *bridgeRouter, QObject *parent = nullptr);

    QString displayName() const override;

    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;
};

#endif
