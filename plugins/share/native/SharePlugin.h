#ifndef AUROBORE_SHARE_PLUGIN_H
#define AUROBORE_SHARE_PLUGIN_H

#include "IPlugin.h"

class SharePlugin : public IPlugin
{
    Q_OBJECT

public:
    explicit SharePlugin(BridgeRouter *bridgeRouter, QObject *parent = nullptr);

    QString displayName() const override;

    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;
};

#endif
