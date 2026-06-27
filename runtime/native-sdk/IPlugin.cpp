#include "IPlugin.h"

#include <QtCore/QVariantMap>

QVariant IPlugin::makeMethodNotFound(const QString &method) const
{
    QVariantMap err;
    err.insert(QStringLiteral("code"), QStringLiteral("BRIDGE_METHOD_NOT_FOUND"));
    err.insert(QStringLiteral("message"), QStringLiteral("Unknown method: ") + method);
    return err;
}

QVariant IPlugin::makeError(const QString &code, const QString &message,
                              const QVariant &data) const
{
    QVariantMap err;
    err.insert(QStringLiteral("code"), code);
    err.insert(QStringLiteral("message"), message);
    if (data.isValid())
        err.insert(QStringLiteral("data"), data);
    return err;
}
