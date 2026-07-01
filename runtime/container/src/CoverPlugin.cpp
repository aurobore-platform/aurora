#include "CoverPlugin.h"

#include "CoverBridge.h"

CoverPlugin::CoverPlugin(BridgeRouter *router, CoverBridge *coverBridge, QObject *parent)
    : IPlugin(router, parent)
    , m_coverBridge(coverBridge)
{
}

QString CoverPlugin::displayName() const
{
    return QStringLiteral("Cover");
}

PluginDescriptor CoverPlugin::descriptor()
{
    PluginDescriptor desc;
    desc.display = QStringLiteral("Cover");
    desc.name = QStringLiteral("cover");
    desc.version = QStringLiteral("1.0.0");
    desc.bridgeProtocol = 1;
    desc.methods = QStringList{
        QStringLiteral("setState"),
        QStringLiteral("setActions"),
        QStringLiteral("reset"),
    };
    desc.events = QStringList{
        QStringLiteral("cover:action"),
        QStringLiteral("cover:active"),
        QStringLiteral("cover:inactive"),
    };
    return desc;
}

QVariant CoverPlugin::invoke(const QString &method, const QVariant &args,
                             const QString &id, bool isStream)
{
    Q_UNUSED(id);
    Q_UNUSED(isStream);

    if (!m_coverBridge)
        return makeError(QStringLiteral("RUNTIME_PLUGIN_ERROR"),
                         QStringLiteral("Cover bridge unavailable"));

    QVariantMap ok;
    ok.insert(QStringLiteral("ok"), true);

    if (method == QStringLiteral("setState")) {
        m_coverBridge->setState(args.toMap());
        return ok;
    }
    if (method == QStringLiteral("setActions")) {
        const QVariantMap map = args.toMap();
        m_coverBridge->setActions(map.value(QStringLiteral("actions")).toList());
        return ok;
    }
    if (method == QStringLiteral("reset")) {
        m_coverBridge->resetToDefaults();
        return ok;
    }

    return makeMethodNotFound(method);
}

IPlugin *createCoverPlugin(BridgeRouter *router, CoverBridge *coverBridge)
{
    return new CoverPlugin(router, coverBridge);
}
