#include "EchoPlugin.h"

#include "BridgeRouter.h"
#include "PluginRegistry.h"

#include <QtCore/QDateTime>
#include <QtCore/QVariantMap>

EchoPlugin::EchoPlugin(BridgeRouter *bridgeRouter, QObject *parent)
    : IPlugin(bridgeRouter, parent)
    , m_streamTimer(new QTimer(this))
{
    m_streamTimer->setInterval(200);
    connect(m_streamTimer, &QTimer::timeout, this, [this]() {
        m_streamTick += 1;
        if (m_streamTick <= 5) {
            QVariantMap payload;
            payload.insert(QStringLiteral("tick"), m_streamTick);
            this->router()->emitStream(m_streamId, QStringLiteral("data"), payload);
        } else {
            m_streamTimer->stop();
            this->router()->emitStream(m_streamId, QStringLiteral("complete"));
            m_streamId.clear();
            m_streamTick = 0;
        }
    });
}

QString EchoPlugin::displayName() const
{
    return QStringLiteral("Echo");
}

QVariant EchoPlugin::invoke(const QString &method, const QVariant &args,
                            const QString &id, bool isStream)
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
        QVariantMap data;
        data.insert(QStringLiteral("code"), 42);
        return makeError(QStringLiteral("ECHO_TEST_ERROR"),
                         QStringLiteral("demo error"), data);
    }

    if (method == QStringLiteral("watchTicks")) {
        startWatchTicks(id);
        return QVariant();
    }

    return makeMethodNotFound(method);
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

void EchoPlugin::cancel(const QString &id)
{
    if (m_streamId != id || !m_streamTimer->isActive())
        return;
    m_streamTimer->stop();
    m_streamId.clear();
    m_streamTick = 0;
}

IPlugin *createEchoPlugin(BridgeRouter *router)
{
    return new EchoPlugin(router);
}
