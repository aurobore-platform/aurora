#ifndef AUROBORE_NOTIFICATIONS_PLUGIN_H
#define AUROBORE_NOTIFICATIONS_PLUGIN_H

#include "IPlugin.h"

class NotificationsPlugin : public IPlugin
{
    Q_OBJECT

public:
    explicit NotificationsPlugin(BridgeRouter *bridgeRouter, QObject *parent = nullptr);

    QString displayName() const override;

    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;
};

#endif
