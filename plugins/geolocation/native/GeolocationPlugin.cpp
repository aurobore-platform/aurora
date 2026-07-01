#include "GeolocationPlugin.h"

#include "BridgeRouter.h"
#include "PluginRegistry.h"

#include <QtCore/QVariant>

GeolocationPlugin::GeolocationPlugin(BridgeRouter *bridgeRouter, QObject *parent)
    : IPlugin(bridgeRouter, parent)
{
}

QString GeolocationPlugin::displayName() const
{
    return QStringLiteral("Geolocation");
}

QVariant GeolocationPlugin::invoke(const QString &method, const QVariant &args,
                                   const QString &id, bool isStream)
{
    Q_UNUSED(args);

    if (method == QStringLiteral("getCurrentPosition") || method == QStringLiteral("clearWatch")) {
        return makeError(QStringLiteral("GEOLOCATION_UNAVAILABLE"),
                         QStringLiteral("geolocation not available"));
    }

    if (method == QStringLiteral("watch")) {
        Q_UNUSED(isStream);
        router()->emitStream(id, QStringLiteral("error"), QVariant(),
                             makeError(QStringLiteral("GEOLOCATION_UNAVAILABLE"),
                                       QStringLiteral("geolocation not available")));
        return QVariant();
    }

    return makeMethodNotFound(method);
}

void GeolocationPlugin::cancel(const QString &id)
{
    Q_UNUSED(id);
}

IPlugin *createGeolocationPlugin(BridgeRouter *router)
{
    return new GeolocationPlugin(router);
}
