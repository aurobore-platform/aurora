#ifndef AUROBORE_GEOLOCATION_PLUGIN_H
#define AUROBORE_GEOLOCATION_PLUGIN_H

#include "IPlugin.h"

#include <QtPositioning/QGeoPositionInfo>
#include <QtPositioning/QGeoPositionInfoSource>

#include <QTimer>

class StreamPublisher;

class GeolocationPlugin : public IPlugin
{
    Q_OBJECT

public:
    explicit GeolocationPlugin(BridgeRouter *bridgeRouter, QObject *parent = nullptr);
    ~GeolocationPlugin() override;

    QString displayName() const override;

    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;

    void cancel(const QString &id) override;

private:
    QGeoPositionInfoSource *ensureSource();
    void applyPositioningArgs(QGeoPositionInfoSource *source, const QVariantMap &args);
    bool cachedPosition(const QVariantMap &args, QVariantMap *out) const;
    void finishGetWithPosition(const QGeoPositionInfo &info);
    void finishGetWithError(const QString &code, const QString &message);
    void clearPendingGet();
    void startWatch(const QString &subscriptionId, const QVariantMap &args);
    void stopWatch();
    void onPositionUpdated(const QGeoPositionInfo &info);
    void onSourceError(QGeoPositionInfoSource::Error error);

    QGeoPositionInfoSource *m_source = nullptr;
    StreamPublisher *m_watchPublisher = nullptr;
    QTimer *m_getTimeoutTimer = nullptr;
    QString m_pendingGetId;
    QString m_watchId;
    bool m_updatesActive = false;
};

#endif
