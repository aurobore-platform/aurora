#include "DevicePlugin.h"

#include "PluginRegistry.h"
#include <QtCore/QLocale>
#include <QtCore/QSysInfo>
#include <QtCore/QVariantMap>

DevicePlugin::DevicePlugin(BridgeRouter *bridgeRouter, QObject *parent)
    : IPlugin(bridgeRouter, parent)
{
}

QString DevicePlugin::displayName() const
{
    return QStringLiteral("Device");
}

QVariant DevicePlugin::invoke(const QString &method, const QVariant &args,
                              const QString &id, bool isStream)
{
    Q_UNUSED(args);
    Q_UNUSED(id);
    Q_UNUSED(isStream);

    if (method != QStringLiteral("getInfo")) {
        return makeMethodNotFound(method);
    }

    QVariantMap result;
    result.insert(QStringLiteral("model"), QSysInfo::prettyProductName());
    result.insert(QStringLiteral("platform"), QSysInfo::productType());
    result.insert(QStringLiteral("osVersion"), QSysInfo::productVersion());
    result.insert(QStringLiteral("locale"), QLocale::system().name());
    return result;
}

IPlugin *createDevicePlugin(BridgeRouter *router)
{
    return new DevicePlugin(router);
}
