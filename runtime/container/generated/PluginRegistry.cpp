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
    },
    {
        QStringLiteral("FileSystem"),
        QStringLiteral("filesystem"),
        QStringLiteral("1.0.0"),
        1,
        QStringList({  }),
        QStringList({ QStringLiteral("appData") }),
        QStringList({ QStringLiteral("readText"), QStringLiteral("writeText"), QStringLiteral("exists"), QStringLiteral("mkdir"), QStringLiteral("delete"), QStringLiteral("list") }),
        QStringList({  })
    },
    {
        QStringLiteral("Clipboard"),
        QStringLiteral("clipboard"),
        QStringLiteral("1.0.0"),
        1,
        QStringList({  }),
        QStringList({  }),
        QStringList({ QStringLiteral("copy"), QStringLiteral("paste") }),
        QStringList({  })
    },
    {
        QStringLiteral("Network"),
        QStringLiteral("network"),
        QStringLiteral("1.0.0"),
        1,
        QStringList({ QStringLiteral("Internet") }),
        QStringList({  }),
        QStringList({ QStringLiteral("getStatus") }),
        QStringList({ QStringLiteral("network:change") })
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
    if (display == QStringLiteral("FileSystem"))
        return createFileSystemPlugin(router);
    if (display == QStringLiteral("Clipboard"))
        return createClipboardPlugin(router);
    if (display == QStringLiteral("Network"))
        return createNetworkPlugin(router);
    return nullptr;
}
