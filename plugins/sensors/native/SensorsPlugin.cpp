#include "SensorsPlugin.h"

#include "BridgeRouter.h"
#include "PluginRegistry.h"

#include <QtCore/QVariant>

SensorsPlugin::SensorsPlugin(BridgeRouter *bridgeRouter, QObject *parent)
    : IPlugin(bridgeRouter, parent)
{
}

QString SensorsPlugin::displayName() const
{
    return QStringLiteral("Sensors");
}

QVariant SensorsPlugin::invoke(const QString &method, const QVariant &args,
                               const QString &id, bool isStream)
{
    Q_UNUSED(args);

    if (method == QStringLiteral("watchAccelerometer") || method == QStringLiteral("watchGyroscope")) {
        Q_UNUSED(isStream);
        router()->emitStream(id, QStringLiteral("error"), QVariant(),
                             makeError(QStringLiteral("SENSORS_UNAVAILABLE"),
                                       QStringLiteral("sensors not available")));
        return QVariant();
    }

    return makeMethodNotFound(method);
}

void SensorsPlugin::cancel(const QString &id)
{
    Q_UNUSED(id);
}

IPlugin *createSensorsPlugin(BridgeRouter *router)
{
    return new SensorsPlugin(router);
}
