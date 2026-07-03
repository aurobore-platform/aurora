#ifndef AUROBORE_SENSORS_PLUGIN_H
#define AUROBORE_SENSORS_PLUGIN_H

#include "IPlugin.h"

class QAccelerometer;
class QGyroscope;
class StreamPublisher;

class SensorsPlugin : public IPlugin
{
    Q_OBJECT

public:
    explicit SensorsPlugin(BridgeRouter *bridgeRouter, QObject *parent = nullptr);
    ~SensorsPlugin() override;

    QString displayName() const override;

    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;

    void cancel(const QString &id) override;

private:
    QAccelerometer *ensureAccelerometer();
    QGyroscope *ensureGyroscope();
    void emitUnavailable(const QString &subscriptionId);
    void startAccelerometerWatch(const QString &subscriptionId);
    void startGyroscopeWatch(const QString &subscriptionId);
    void stopAccelerometerWatch();
    void stopGyroscopeWatch();
    void onAccelerometerReading();
    void onGyroscopeReading();
    void onAccelerometerError(int error);
    void onGyroscopeError(int error);

    QAccelerometer *m_accelerometer = nullptr;
    QGyroscope *m_gyroscope = nullptr;
    StreamPublisher *m_accelPublisher = nullptr;
    StreamPublisher *m_gyroPublisher = nullptr;
    QString m_accelWatchId;
    QString m_gyroWatchId;
};

#endif
