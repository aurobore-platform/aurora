#include "GeolocationMapping.h"

#include <QtCore/QDateTime>
#include <QtPositioning/QGeoCoordinate>
#include <QtPositioning/QGeoPositionInfo>

QVariantMap positionFromInfo(const QGeoPositionInfo &info)
{
    const QGeoCoordinate coord = info.coordinate();
    QVariantMap result;
    result.insert(QStringLiteral("latitude"), coord.latitude());
    result.insert(QStringLiteral("longitude"), coord.longitude());

    if (info.hasAttribute(QGeoPositionInfo::HorizontalAccuracy)) {
        result.insert(QStringLiteral("accuracy"),
                      info.attribute(QGeoPositionInfo::HorizontalAccuracy));
    }
    if (info.hasAttribute(QGeoPositionInfo::VerticalAccuracy)) {
        result.insert(QStringLiteral("altitudeAccuracy"),
                      info.attribute(QGeoPositionInfo::VerticalAccuracy));
    }
    if (coord.type() != QGeoCoordinate::InvalidCoordinate) {
        if (!qIsNaN(coord.altitude())) {
            result.insert(QStringLiteral("altitude"), coord.altitude());
        }
    }
    if (info.hasAttribute(QGeoPositionInfo::Direction)) {
        result.insert(QStringLiteral("heading"),
                      info.attribute(QGeoPositionInfo::Direction));
    }
    if (info.hasAttribute(QGeoPositionInfo::GroundSpeed)) {
        result.insert(QStringLiteral("speed"),
                      info.attribute(QGeoPositionInfo::GroundSpeed));
    }

    const QDateTime ts = info.timestamp();
    const qint64 ms = ts.isValid() ? ts.toMSecsSinceEpoch()
                                   : QDateTime::currentMSecsSinceEpoch();
    result.insert(QStringLiteral("timestamp"), ms);
    return result;
}
