#include "{{DISPLAY}}Plugin.h"

#include "PluginRegistry.h"

#include <QtCore/QVariant>

{{DISPLAY}}Plugin::{{DISPLAY}}Plugin(BridgeRouter *bridgeRouter, QObject *parent)
    : IPlugin(bridgeRouter, parent)
{
}

QString {{DISPLAY}}Plugin::displayName() const
{
    return QStringLiteral("{{display}}");
}

QVariant {{DISPLAY}}Plugin::invoke(const QString &method, const QVariant &args,
                              const QString &id, bool isStream)
{
    Q_UNUSED(args);
    Q_UNUSED(id);
    Q_UNUSED(isStream);

    if (method == QStringLiteral("ping")) {
        return makeError(QStringLiteral("{{ERROR_CODE}}"),
                         QStringLiteral("{{name}} not available"));
    }

    return makeMethodNotFound(method);
}

IPlugin *create{{DISPLAY}}Plugin(BridgeRouter *router)
{
    return new {{DISPLAY}}Plugin(router);
}
