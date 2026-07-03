#ifndef AUROBORE_SENSORS_MAPPING_H
#define AUROBORE_SENSORS_MAPPING_H

#include <QtCore/QVariantMap>

class QAccelerometerReading;
class QGyroscopeReading;

QVariantMap readingFromAccelerometer(const QAccelerometerReading *reading, qint64 timestampMs);
QVariantMap readingFromGyroscope(const QGyroscopeReading *reading, qint64 timestampMs);

#endif
