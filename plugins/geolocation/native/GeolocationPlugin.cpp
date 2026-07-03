#include "GeolocationPlugin.h"

#include "BridgeRouter.h"
#include "GeolocationMapping.h"
#include "PluginRegistry.h"
#include "StreamPublisher.h"

#include <QtCore/QDateTime>
#include <QtCore/QVariantMap>
#include <QtPositioning/QGeoPositionInfoSource>

namespace {

constexpr int kDefaultGetTimeoutMs = 0;

int intArg(const QVariantMap &args, const char *key, int defaultValue)
{
    if (!args.contains(QString::fromLatin1(key)))
        return defaultValue;
    return args.value(QString::fromLatin1(key)).toInt();
}

bool boolArg(const QVariantMap &args, const char *key, bool defaultValue)
{
    if (!args.contains(QString::fromLatin1(key)))
        return defaultValue;
    return args.value(QString::fromLatin1(key)).toBool();
}

} // namespace

GeolocationPlugin::GeolocationPlugin(BridgeRouter *bridgeRouter, QObject *parent)
    : IPlugin(bridgeRouter, parent)
    , m_watchPublisher(new StreamPublisher(bridgeRouter, this))
    , m_getTimeoutTimer(new QTimer(this))
{
    m_getTimeoutTimer->setSingleShot(true);
    connect(m_getTimeoutTimer, &QTimer::timeout, this, [this]() {
        if (m_pendingGetId.isEmpty())
            return;
        finishGetWithError(QStringLiteral("GEOLOCATION_UNAVAILABLE"),
                           QStringLiteral("position request timed out"));
    });
}

GeolocationPlugin::~GeolocationPlugin()
{
    stopWatch();
    delete m_source;
    m_source = nullptr;
}

QString GeolocationPlugin::displayName() const
{
    return QStringLiteral("Geolocation");
}

QGeoPositionInfoSource *GeolocationPlugin::ensureSource()
{
    if (m_source)
        return m_source;

    m_source = QGeoPositionInfoSource::createDefaultSource(this);
    if (!m_source)
        return nullptr;

    connect(m_source, &QGeoPositionInfoSource::positionUpdated,
            this, &GeolocationPlugin::onPositionUpdated);
#if QT_VERSION >= QT_VERSION_CHECK(5, 12, 0)
    connect(m_source, &QGeoPositionInfoSource::errorOccurred,
            this, &GeolocationPlugin::onSourceError);
#else
    connect(m_source,
            static_cast<void (QGeoPositionInfoSource::*)(QGeoPositionInfoSource::Error)>(
                &QGeoPositionInfoSource::error),
            this, &GeolocationPlugin::onSourceError);
#endif

    return m_source;
}

void GeolocationPlugin::applyPositioningArgs(QGeoPositionInfoSource *source,
                                             const QVariantMap &args)
{
    if (!source)
        return;

    if (boolArg(args, "enableHighAccuracy", false)) {
        source->setPreferredPositioningMethods(
            QGeoPositionInfoSource::SatellitePositioningMethods);
    } else {
        source->setPreferredPositioningMethods(
            QGeoPositionInfoSource::AllPositioningMethods);
    }
}

bool GeolocationPlugin::cachedPosition(const QVariantMap &args, QVariantMap *out) const
{
    if (!m_source || !out)
        return false;

    bool valid = false;
    const QGeoPositionInfo info = m_source->lastKnownPosition(&valid);
    if (!valid || !info.isValid())
        return false;

    const int maximumAge = intArg(args, "maximumAge", -1);
    if (maximumAge >= 0) {
        const qint64 ageMs =
            QDateTime::currentMSecsSinceEpoch() - info.timestamp().toMSecsSinceEpoch();
        if (ageMs > maximumAge)
            return false;
    }

    *out = positionFromInfo(info);
    return true;
}

void GeolocationPlugin::finishGetWithPosition(const QGeoPositionInfo &info)
{
    if (m_pendingGetId.isEmpty())
        return;

    const QString invokeId = m_pendingGetId;
    clearPendingGet();
    router()->emitOutbound(
        router()->makeOkResponse(invokeId, positionFromInfo(info)));
}

void GeolocationPlugin::finishGetWithError(const QString &code, const QString &message)
{
    if (m_pendingGetId.isEmpty())
        return;

    const QString invokeId = m_pendingGetId;
    clearPendingGet();
    router()->emitOutbound(router()->makeErrorResponse(invokeId, code, message));
}

void GeolocationPlugin::clearPendingGet()
{
    m_pendingGetId.clear();
    if (m_getTimeoutTimer->isActive())
        m_getTimeoutTimer->stop();
}

void GeolocationPlugin::startWatch(const QString &subscriptionId, const QVariantMap &args)
{
    stopWatch();

    QGeoPositionInfoSource *source = ensureSource();
    if (!source) {
        router()->emitStream(subscriptionId, QStringLiteral("error"), QVariant(),
                             makeError(QStringLiteral("GEOLOCATION_UNAVAILABLE"),
                                       QStringLiteral("geolocation not available")));
        return;
    }

    applyPositioningArgs(source, args);

    m_watchId = subscriptionId;
    const int maxHz = router()->streamMaxFps(subscriptionId);
    m_watchPublisher->setMaxHz(maxHz < 1 ? 60 : maxHz);
    m_watchPublisher->start(subscriptionId);

    if (!m_updatesActive) {
        source->startUpdates();
        m_updatesActive = true;
    }
}

void GeolocationPlugin::stopWatch()
{
    if (m_watchId.isEmpty())
        return;

    m_watchPublisher->cancel();
    m_watchId.clear();

    if (m_updatesActive && m_source) {
        m_source->stopUpdates();
        m_updatesActive = false;
    }
}

void GeolocationPlugin::onPositionUpdated(const QGeoPositionInfo &info)
{
    if (!info.isValid())
        return;

    if (!m_pendingGetId.isEmpty())
        finishGetWithPosition(info);

    if (!m_watchId.isEmpty() && m_watchPublisher->isActive())
        m_watchPublisher->push(positionFromInfo(info));
}

void GeolocationPlugin::onSourceError(QGeoPositionInfoSource::Error error)
{
    Q_UNUSED(error);

    if (!m_pendingGetId.isEmpty()) {
        finishGetWithError(QStringLiteral("GEOLOCATION_UNAVAILABLE"),
                           QStringLiteral("geolocation not available"));
    }

    if (!m_watchId.isEmpty()) {
        const QString id = m_watchId;
        stopWatch();
        router()->emitStream(id, QStringLiteral("error"), QVariant(),
                             makeError(QStringLiteral("GEOLOCATION_UNAVAILABLE"),
                                       QStringLiteral("geolocation not available")));
    }
}

QVariant GeolocationPlugin::invoke(const QString &method, const QVariant &args,
                                   const QString &id, bool isStream)
{
    const QVariantMap argMap = args.toMap();

    if (method == QStringLiteral("getCurrentPosition")) {
        if (!m_pendingGetId.isEmpty()) {
            return makeError(QStringLiteral("GEOLOCATION_UNAVAILABLE"),
                             QStringLiteral("geolocation request already in progress"));
        }

        QVariantMap cached;
        if (cachedPosition(argMap, &cached))
            return cached;

        QGeoPositionInfoSource *source = ensureSource();
        if (!source) {
            return makeError(QStringLiteral("GEOLOCATION_UNAVAILABLE"),
                             QStringLiteral("geolocation not available"));
        }

        applyPositioningArgs(source, argMap);

        const int timeout = intArg(argMap, "timeout", kDefaultGetTimeoutMs);
        m_pendingGetId = id;
        if (timeout > 0)
            m_getTimeoutTimer->start(timeout);

        source->requestUpdate(timeout > 0 ? timeout : 0);
        return QVariant();
    }

    if (method == QStringLiteral("watch")) {
        Q_UNUSED(isStream);
        startWatch(id, argMap);
        return QVariant();
    }

    if (method == QStringLiteral("clearWatch")) {
        const QString watchId = argMap.value(QStringLiteral("watchId")).toString();
        if (!watchId.isEmpty() && watchId == m_watchId)
            stopWatch();
        return QVariant();
    }

    return makeMethodNotFound(method);
}

void GeolocationPlugin::cancel(const QString &id)
{
    if (m_pendingGetId == id) {
        finishGetWithError(QStringLiteral("GEOLOCATION_CANCELLED"),
                           QStringLiteral("user cancelled"));
        return;
    }

    if (m_watchId == id)
        stopWatch();
}

IPlugin *createGeolocationPlugin(BridgeRouter *router)
{
    return new GeolocationPlugin(router);
}
