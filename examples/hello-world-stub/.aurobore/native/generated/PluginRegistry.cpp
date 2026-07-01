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
        QStringLiteral("Device"),
        QStringLiteral("device"),
        QStringLiteral("1.0.0"),
        1,
        QStringList({  }),
        QStringList({  }),
        QStringList({ QStringLiteral("getInfo") }),
        QStringList({  })
    },
    {
        QStringLiteral("Storage"),
        QStringLiteral("storage"),
        QStringLiteral("1.0.0"),
        1,
        QStringList({  }),
        QStringList({  }),
        QStringList({ QStringLiteral("get"), QStringLiteral("set"), QStringLiteral("remove"), QStringLiteral("keys"), QStringLiteral("clear") }),
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
    if (display == QStringLiteral("Storage"))
        return createStoragePlugin(router);
    return nullptr;
}
