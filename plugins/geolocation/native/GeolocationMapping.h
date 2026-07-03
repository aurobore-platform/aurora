#ifndef AUROBORE_GEOLOCATION_MAPPING_H
#define AUROBORE_GEOLOCATION_MAPPING_H

#include <QtCore/QVariantMap>

class QGeoPositionInfo;

QVariantMap positionFromInfo(const QGeoPositionInfo &info);

#endif
