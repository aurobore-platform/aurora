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
    },
    {
        QStringLiteral("Camera"),
        QStringLiteral("camera"),
        QStringLiteral("1.0.0"),
        1,
        QStringList({ QStringLiteral("Camera") }),
        QStringList({  }),
        QStringList({ QStringLiteral("getPhoto"), QStringLiteral("pickPhoto"), QStringLiteral("watchPreview") }),
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
    },
    {
        QStringLiteral("Notifications"),
        QStringLiteral("notifications"),
        QStringLiteral("1.0.0"),
        1,
        QStringList({ QStringLiteral("Notifications") }),
        QStringList({  }),
        QStringList({ QStringLiteral("schedule"), QStringLiteral("notify"), QStringLiteral("cancel"), QStringLiteral("cancelAll") }),
        QStringList({ QStringLiteral("notification:tap") })
    },
    {
        QStringLiteral("Share"),
        QStringLiteral("share"),
        QStringLiteral("1.0.0"),
        1,
        QStringList({  }),
        QStringList({  }),
        QStringList({ QStringLiteral("shareText"), QStringLiteral("shareUrl"), QStringLiteral("shareFile") }),
        QStringList({  })
    },
    {
        QStringLiteral("Sensors"),
        QStringLiteral("sensors"),
        QStringLiteral("1.0.0"),
        1,
        QStringList({  }),
        QStringList({  }),
        QStringList({ QStringLiteral("watchAccelerometer"), QStringLiteral("watchGyroscope") }),
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
    if (display == QStringLiteral("FileSystem"))
        return createFileSystemPlugin(router);
    if (display == QStringLiteral("Clipboard"))
        return createClipboardPlugin(router);
    if (display == QStringLiteral("Network"))
        return createNetworkPlugin(router);
    if (display == QStringLiteral("Camera"))
        return createCameraPlugin(router);
    if (display == QStringLiteral("Geolocation"))
        return createGeolocationPlugin(router);
    if (display == QStringLiteral("Notifications"))
        return createNotificationsPlugin(router);
    if (display == QStringLiteral("Share"))
        return createSharePlugin(router);
    if (display == QStringLiteral("Sensors"))
        return createSensorsPlugin(router);
    return nullptr;
}
