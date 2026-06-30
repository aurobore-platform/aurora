#ifndef AUROBORE_ECHO_PLUGIN_H
#define AUROBORE_ECHO_PLUGIN_H

#include "IPlugin.h"

#include <QTimer>
#include <QVariant>

class StreamPublisher;

class EchoPlugin : public IPlugin
{
    Q_OBJECT

public:
    explicit EchoPlugin(BridgeRouter *bridgeRouter, QObject *parent = nullptr);
    ~EchoPlugin() override;

    QString displayName() const override;

    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;

    void cancel(const QString &id) override;

private:
    void startWatchTicks(const QString &subscriptionId);
    void startWatchFastTicks(const QString &subscriptionId, int maxHz);
    QVariant getSampleResource();

    QTimer *m_streamTimer = nullptr;
    QTimer *m_fastSourceTimer = nullptr;
    StreamPublisher *m_fastPublisher = nullptr;
    QString m_streamId;
    int m_streamTick = 0;
    int m_fastTick = 0;
    int m_fastTickLimit = 0;
};

#endif
