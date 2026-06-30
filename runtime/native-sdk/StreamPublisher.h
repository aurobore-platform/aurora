#ifndef AUROBORE_STREAM_PUBLISHER_H
#define AUROBORE_STREAM_PUBLISHER_H

#include <QObject>
#include <QString>
#include <QTimer>
#include <QVariant>

class BridgeRouter;

/** Throttled native→JS stream emitter (FR-B8). */
class StreamPublisher : public QObject
{
    Q_OBJECT

public:
    explicit StreamPublisher(BridgeRouter *router, QObject *parent = nullptr);

    void setMaxHz(int hz);
    int maxHz() const { return m_maxHz; }

    bool isActive() const { return !m_subscriptionId.isEmpty(); }
    const QString &subscriptionId() const { return m_subscriptionId; }

    void start(const QString &subscriptionId);
    void push(const QVariant &payload);
    void complete();
    void cancel();

private:
    void flushPending();
    void stopTimer();

    BridgeRouter *m_router = nullptr;
    QString m_subscriptionId;
    QTimer m_emitTimer;
    QVariant m_pending;
    bool m_hasPending = false;
    int m_maxHz = 60;
};

#endif
