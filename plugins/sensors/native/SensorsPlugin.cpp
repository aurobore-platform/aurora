#include "SensorsPlugin.h"

#include "BridgeRouter.h"
#include "PluginRegistry.h"
#include "SensorsMapping.h"
#include "StreamPublisher.h"

#include <QtCore/QDateTime>
#include <QtSensors/QAccelerometer>
#include <QtSensors/QGyroscope>

SensorsPlugin::SensorsPlugin(BridgeRouter *bridgeRouter, QObject *parent)
    : IPlugin(bridgeRouter, parent)
    , m_accelPublisher(new StreamPublisher(bridgeRouter, this))
    , m_gyroPublisher(new StreamPublisher(bridgeRouter, this))
{
}

SensorsPlugin::~SensorsPlugin()
{
    stopAccelerometerWatch();
    stopGyroscopeWatch();
}

QString SensorsPlugin::displayName() const
{
    return QStringLiteral("Sensors");
}

QAccelerometer *SensorsPlugin::ensureAccelerometer()
{
    if (m_accelerometer)
        return m_accelerometer;

    m_accelerometer = new QAccelerometer(this);
    connect(m_accelerometer, &QAccelerometer::readingChanged,
            this, &SensorsPlugin::onAccelerometerReading);
    connect(m_accelerometer, &QSensor::sensorError,
            this, &SensorsPlugin::onAccelerometerError);
    return m_accelerometer;
}

QGyroscope *SensorsPlugin::ensureGyroscope()
{
    if (m_gyroscope)
        return m_gyroscope;

    m_gyroscope = new QGyroscope(this);
    connect(m_gyroscope, &QGyroscope::readingChanged,
            this, &SensorsPlugin::onGyroscopeReading);
    connect(m_gyroscope, &QSensor::sensorError,
            this, &SensorsPlugin::onGyroscopeError);
    return m_gyroscope;
}

void SensorsPlugin::emitUnavailable(const QString &subscriptionId)
{
    router()->emitStream(subscriptionId, QStringLiteral("error"), QVariant(),
                         makeError(QStringLiteral("SENSORS_UNAVAILABLE"),
                                   QStringLiteral("sensors not available")));
}

void SensorsPlugin::startAccelerometerWatch(const QString &subscriptionId)
{
    stopAccelerometerWatch();

    QAccelerometer *sensor = ensureAccelerometer();
    if (!sensor->connectToBackend()) {
        emitUnavailable(subscriptionId);
        return;
    }

    m_accelWatchId = subscriptionId;
    const int maxHz = router()->streamMaxFps(subscriptionId);
    m_accelPublisher->setMaxHz(maxHz < 1 ? 60 : maxHz);
    m_accelPublisher->start(subscriptionId);
    sensor->start();
}

void SensorsPlugin::startGyroscopeWatch(const QString &subscriptionId)
{
    stopGyroscopeWatch();

    QGyroscope *sensor = ensureGyroscope();
    if (!sensor->connectToBackend()) {
        emitUnavailable(subscriptionId);
        return;
    }

    m_gyroWatchId = subscriptionId;
    const int maxHz = router()->streamMaxFps(subscriptionId);
    m_gyroPublisher->setMaxHz(maxHz < 1 ? 60 : maxHz);
    m_gyroPublisher->start(subscriptionId);
    sensor->start();
}

void SensorsPlugin::stopAccelerometerWatch()
{
    if (m_accelWatchId.isEmpty())
        return;

    m_accelPublisher->cancel();
    m_accelWatchId.clear();

    if (m_accelerometer)
        m_accelerometer->stop();
}

void SensorsPlugin::stopGyroscopeWatch()
{
    if (m_gyroWatchId.isEmpty())
        return;

    m_gyroPublisher->cancel();
    m_gyroWatchId.clear();

    if (m_gyroscope)
        m_gyroscope->stop();
}

void SensorsPlugin::onAccelerometerReading()
{
    if (m_accelWatchId.isEmpty() || !m_accelPublisher->isActive() || !m_accelerometer)
        return;

    const QAccelerometerReading *reading = m_accelerometer->reading();
    if (!reading)
        return;

    const qint64 timestampMs = QDateTime::currentMSecsSinceEpoch();
    m_accelPublisher->push(readingFromAccelerometer(reading, timestampMs));
}

void SensorsPlugin::onGyroscopeReading()
{
    if (m_gyroWatchId.isEmpty() || !m_gyroPublisher->isActive() || !m_gyroscope)
        return;

    const QGyroscopeReading *reading = m_gyroscope->reading();
    if (!reading)
        return;

    const qint64 timestampMs = QDateTime::currentMSecsSinceEpoch();
    m_gyroPublisher->push(readingFromGyroscope(reading, timestampMs));
}

void SensorsPlugin::onAccelerometerError(int error)
{
    Q_UNUSED(error);

    if (m_accelWatchId.isEmpty())
        return;

    const QString id = m_accelWatchId;
    stopAccelerometerWatch();
    emitUnavailable(id);
}

void SensorsPlugin::onGyroscopeError(int error)
{
    Q_UNUSED(error);

    if (m_gyroWatchId.isEmpty())
        return;

    const QString id = m_gyroWatchId;
    stopGyroscopeWatch();
    emitUnavailable(id);
}

QVariant SensorsPlugin::invoke(const QString &method, const QVariant &args,
                               const QString &id, bool isStream)
{
    Q_UNUSED(args);

    if (method == QStringLiteral("watchAccelerometer")) {
        Q_UNUSED(isStream);
        startAccelerometerWatch(id);
        return QVariant();
    }

    if (method == QStringLiteral("watchGyroscope")) {
        Q_UNUSED(isStream);
        startGyroscopeWatch(id);
        return QVariant();
    }

    return makeMethodNotFound(method);
}

void SensorsPlugin::cancel(const QString &id)
{
    if (m_accelWatchId == id)
        stopAccelerometerWatch();
    if (m_gyroWatchId == id)
        stopGyroscopeWatch();
}

IPlugin *createSensorsPlugin(BridgeRouter *router)
{
    return new SensorsPlugin(router);
}
