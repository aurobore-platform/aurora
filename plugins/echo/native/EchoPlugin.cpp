#include "EchoPlugin.h"

#include "BridgeRouter.h"
#include "PluginRegistry.h"
#include "ResourceRef.h"
#include "StreamPublisher.h"

#include <QtCore/QDateTime>
#include <QtCore/QStandardPaths>
#include <QtCore/QVariantMap>

EchoPlugin::EchoPlugin(BridgeRouter *bridgeRouter, QObject *parent)
    : IPlugin(bridgeRouter, parent)
    , m_streamTimer(new QTimer(this))
    , m_fastSourceTimer(new QTimer(this))
    , m_fastPublisher(new StreamPublisher(bridgeRouter, this))
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

    m_fastSourceTimer->setInterval(1);
    connect(m_fastSourceTimer, &QTimer::timeout, this, [this]() {
        if (m_streamId.isEmpty() || !m_fastPublisher->isActive())
            return;
        m_fastTick += 1;
        QVariantMap payload;
        payload.insert(QStringLiteral("tick"), m_fastTick);
        m_fastPublisher->push(payload);
        if (m_fastTick >= m_fastTickLimit) {
            m_fastSourceTimer->stop();
            m_fastPublisher->complete();
            m_streamId.clear();
            m_fastTick = 0;
        }
    });
}

EchoPlugin::~EchoPlugin() = default;

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

    if (method == QStringLiteral("watchFastTicks")) {
        const int maxHz = router()->streamMaxFps(id);
        startWatchFastTicks(id, maxHz);
        return QVariant();
    }

    if (method == QStringLiteral("getSampleResource")) {
        return getSampleResource();
    }

    return makeMethodNotFound(method);
}

void EchoPlugin::startWatchTicks(const QString &subscriptionId)
{
    if (m_streamTimer->isActive())
        m_streamTimer->stop();
    if (m_fastSourceTimer->isActive()) {
        m_fastSourceTimer->stop();
        m_fastPublisher->cancel();
    }
    m_streamId = subscriptionId;
    m_streamTick = 0;
    m_streamTimer->start();
}

void EchoPlugin::startWatchFastTicks(const QString &subscriptionId, int maxHz)
{
    if (m_streamTimer->isActive())
        m_streamTimer->stop();
    if (m_fastSourceTimer->isActive()) {
        m_fastSourceTimer->stop();
        m_fastPublisher->cancel();
    }

    m_streamId = subscriptionId;
    m_fastTick = 0;
    m_fastTickLimit = 60;
    m_fastPublisher->setMaxHz(maxHz < 1 ? 60 : maxHz);
    m_fastPublisher->start(subscriptionId);
    m_fastSourceTimer->start();
}

QVariant EchoPlugin::getSampleResource()
{
    const QString appDataRoot =
        QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    const QByteArray body("Aurobore A1 sample resource\n");
    const QVariantMap ref = AuroboreResource::writeAppDataFile(
        appDataRoot,
        QStringLiteral("echo/sample.txt"),
        body,
        QStringLiteral("text/plain"));
    if (ref.isEmpty()) {
        return makeError(QStringLiteral("ECHO_RESOURCE_ERROR"),
                         QStringLiteral("failed to write sample resource"));
    }
    return ref;
}

void EchoPlugin::cancel(const QString &id)
{
    if (m_streamId != id)
        return;

    if (m_streamTimer->isActive())
        m_streamTimer->stop();
    if (m_fastSourceTimer->isActive()) {
        m_fastSourceTimer->stop();
        m_fastPublisher->cancel();
    }
    m_streamId.clear();
    m_streamTick = 0;
    m_fastTick = 0;
}

IPlugin *createEchoPlugin(BridgeRouter *router)
{
    return new EchoPlugin(router);
}
