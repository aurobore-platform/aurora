#include "EchoPlugin.h"
#include "BridgeRouter.h"

#include <QtCore/QDateTime>
#include <QtCore/QVariantMap>

EchoPlugin::EchoPlugin(BridgeRouter *router, QObject *parent)
    : QObject(parent)
    , m_router(router)
    , m_streamTimer(new QTimer(this))
{
    m_streamTimer->setInterval(200);
    connect(m_streamTimer, &QTimer::timeout, this, [this]() {
        m_streamTick += 1;
        if (m_streamTick <= 5) {
            QVariantMap payload;
            payload.insert(QStringLiteral("tick"), m_streamTick);
            m_router->emitStream(m_streamId, QStringLiteral("data"), payload);
        } else {
            m_streamTimer->stop();
            m_router->emitStream(m_streamId, QStringLiteral("complete"));
            m_streamId.clear();
            m_streamTick = 0;
        }
    });
}

QVariant EchoPlugin::invoke(const QString &method, const QVariant &args, const QString &id, bool isStream)
{
    Q_UNUSED(isStream);

    if (method == QStringLiteral("ping")) {
        QVariantMap result;
        result.insert(QStringLiteral("pong"), true);
        result.insert(QStringLiteral("ts"), QDateTime::currentMSecsSinceEpoch());
        return result;
    }

    if (method == QStringLiteral("echo")) {
        return args;
    }

    if (method == QStringLiteral("fail")) {
        QVariantMap err;
        err.insert(QStringLiteral("code"), QStringLiteral("ECHO_TEST_ERROR"));
        err.insert(QStringLiteral("message"), QStringLiteral("demo error"));
        QVariantMap data;
        data.insert(QStringLiteral("code"), 42);
        err.insert(QStringLiteral("data"), data);
        return err;
    }

    if (method == QStringLiteral("watchTicks")) {
        startWatchTicks(id);
        return QVariant();
    }

    QVariantMap err;
    err.insert(QStringLiteral("code"), QStringLiteral("BRIDGE_METHOD_NOT_FOUND"));
    err.insert(QStringLiteral("message"), QStringLiteral("Unknown method: ") + method);
    return err;
}

void EchoPlugin::startWatchTicks(const QString &subscriptionId)
{
    if (m_streamTimer->isActive()) {
        m_streamTimer->stop();
    }
    m_streamId = subscriptionId;
    m_streamTick = 0;
    m_streamTimer->start();
}
