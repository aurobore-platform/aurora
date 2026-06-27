#ifndef AUROBORE_ECHO_PLUGIN_H
#define AUROBORE_ECHO_PLUGIN_H

#include "IPlugin.h"

#include <QTimer>
#include <QVariant>

class EchoPlugin : public IPlugin
{
    Q_OBJECT

public:
    explicit EchoPlugin(BridgeRouter *bridgeRouter, QObject *parent = nullptr);

    QString displayName() const override;

    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;

    void cancel(const QString &id) override;

private:
    void startWatchTicks(const QString &subscriptionId);

    QTimer *m_streamTimer = nullptr;
    QString m_streamId;
    int m_streamTick = 0;
};

#endif
