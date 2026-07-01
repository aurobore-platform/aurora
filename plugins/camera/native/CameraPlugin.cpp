#include "CameraPlugin.h"

#include "PluginRegistry.h"

#include <QtCore/QVariant>

CameraPlugin::CameraPlugin(BridgeRouter *bridgeRouter, QObject *parent)
    : IPlugin(bridgeRouter, parent)
{
}

QString CameraPlugin::displayName() const
{
    return QStringLiteral("Camera");
}

QVariant CameraPlugin::invoke(const QString &method, const QVariant &args,
                              const QString &id, bool isStream)
{
    Q_UNUSED(args);
    Q_UNUSED(id);
    Q_UNUSED(isStream);

    if (method == QStringLiteral("getPhoto") || method == QStringLiteral("pickPhoto")) {
        return makeError(QStringLiteral("CAMERA_UNAVAILABLE"),
                         QStringLiteral("camera or gallery not available"));
    }

    return makeMethodNotFound(method);
}

IPlugin *createCameraPlugin(BridgeRouter *router)
{
    return new CameraPlugin(router);
}
