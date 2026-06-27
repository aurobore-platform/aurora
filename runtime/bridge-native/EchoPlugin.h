#ifndef AUROBORE_ECHO_PLUGIN_H
#define AUROBORE_ECHO_PLUGIN_H

#include <QObject>
#include <QTimer>
#include <QVariant>

class BridgeRouter;

class EchoPlugin : public QObject
{
    Q_OBJECT

public:
    explicit EchoPlugin(BridgeRouter *router, QObject *parent = nullptr);

    QVariant invoke(const QString &method, const QVariant &args, const QString &id, bool isStream);

private:
    void startWatchTicks(const QString &subscriptionId);

    BridgeRouter *m_router = nullptr;
    QTimer *m_streamTimer = nullptr;
    QString m_streamId;
    int m_streamTick = 0;
};

#endif
