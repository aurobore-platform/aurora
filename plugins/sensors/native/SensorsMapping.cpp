#include "SensorsMapping.h"

#include <QtCore/QVariantMap>
#include <QtSensors/QAccelerometerReading>
#include <QtSensors/QGyroscopeReading>

namespace {

QVariantMap readingFromAxes(double x, double y, double z, qint64 timestampMs)
{
    QVariantMap result;
    result.insert(QStringLiteral("x"), x);
    result.insert(QStringLiteral("y"), y);
    result.insert(QStringLiteral("z"), z);
    result.insert(QStringLiteral("timestamp"), timestampMs);
    return result;
}

} // namespace

QVariantMap readingFromAccelerometer(const QAccelerometerReading *reading, qint64 timestampMs)
{
    if (!reading)
        return QVariantMap();
    return readingFromAxes(reading->x(), reading->y(), reading->z(), timestampMs);
}

QVariantMap readingFromGyroscope(const QGyroscopeReading *reading, qint64 timestampMs)
{
    if (!reading)
        return QVariantMap();
    return readingFromAxes(reading->x(), reading->y(), reading->z(), timestampMs);
}
