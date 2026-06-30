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
        QStringList({ QStringLiteral("ping"), QStringLiteral("echo"), QStringLiteral("fail"), QStringLiteral("watchTicks") }),
        QStringList({  })
    },
    {
        QStringLiteral("Device"),
        QStringLiteral("device"),
        QStringLiteral("1.0.0"),
        1,
        QStringList({  }),
        QStringList({ QStringLiteral("getInfo") }),
        QStringList({  })
    }
    };
}

IPlugin *PluginRegistry::createPlugin(const QString &display, BridgeRouter *router)
{
    if (display == QStringLiteral("Echo"))
        return createEchoPlugin(router);
    if (display == QStringLiteral("Device"))
        return createDevicePlugin(router);
    return nullptr;
}
