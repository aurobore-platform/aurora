// @generated — do not edit
#include "PluginRegistry.h"

#include <QtCore/QString>

QList<PluginDescriptor> PluginRegistry::descriptors()
{
    return {
    {
        QStringLiteral("Echo"),
        QStringLiteral("echo"),
        QStringLiteral("1.0.0"),
        1,
        QStringList({  }),
        QStringList({  }),
        QStringList({ QStringLiteral("ping"), QStringLiteral("echo"), QStringLiteral("fail"), QStringLiteral("watchTicks"), QStringLiteral("watchFastTicks"), QStringLiteral("getSampleResource") }),
        QStringList({  })
    },
    {
        QStringLiteral("Geolocation"),
        QStringLiteral("geolocation"),
        QStringLiteral("1.0.0"),
        1,
        QStringList({ QStringLiteral("Location") }),
        QStringList({  }),
        QStringList({ QStringLiteral("getCurrentPosition"), QStringLiteral("watch"), QStringLiteral("clearWatch") }),
        QStringList({  })
    }
    };
}

IPlugin *PluginRegistry::createPlugin(const QString &display, BridgeRouter *router)
{
    if (display == QStringLiteral("Echo"))
        return createEchoPlugin(router);
    if (display == QStringLiteral("Geolocation"))
        return createGeolocationPlugin(router);
    return nullptr;
}
