#include "StreamPublisher.h"

#include "BridgeRouter.h"

#include <QtCore/QVariantMap>

StreamPublisher::StreamPublisher(BridgeRouter *router, QObject *parent)
    : QObject(parent)
    , m_router(router)
{
    m_emitTimer.setSingleShot(false);
    connect(&m_emitTimer, &QTimer::timeout, this, &StreamPublisher::flushPending);
    setMaxHz(60);
}

void StreamPublisher::setMaxHz(int hz)
{
    m_maxHz = hz < 1 ? 1 : hz;
    m_emitTimer.setInterval(1000 / m_maxHz);
}

void StreamPublisher::start(const QString &subscriptionId)
{
    cancel();
    m_subscriptionId = subscriptionId;
    m_hasPending = false;
    m_pending = QVariant();
    m_emitTimer.start();
}

void StreamPublisher::push(const QVariant &payload)
{
    if (m_subscriptionId.isEmpty() || !m_router)
        return;
    m_pending = payload;
    m_hasPending = true;
}

void StreamPublisher::flushPending()
{
    if (!m_hasPending || m_subscriptionId.isEmpty() || !m_router)
        return;
    m_router->emitStream(m_subscriptionId, QStringLiteral("data"), m_pending);
    m_hasPending = false;
}

void StreamPublisher::complete()
{
    if (m_subscriptionId.isEmpty() || !m_router)
        return;
    flushPending();
    stopTimer();
    m_router->emitStream(m_subscriptionId, QStringLiteral("complete"));
    m_subscriptionId.clear();
    m_hasPending = false;
}

void StreamPublisher::cancel()
{
    stopTimer();
    m_subscriptionId.clear();
    m_hasPending = false;
    m_pending = QVariant();
}

void StreamPublisher::stopTimer()
{
    if (m_emitTimer.isActive())
        m_emitTimer.stop();
}
