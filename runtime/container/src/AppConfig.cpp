#include "AppConfig.h"

#include <auroraapp/auroraapp.h>

#include <QtCore/QDebug>
#include <QtCore/QFile>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QUrl>

namespace Aurobore {

namespace {

QString resolveConfigPath()
{
    const QUrl configUrl = Aurora::Application::pathTo(QStringLiteral("config/defaults.json"));
    QString configPath = configUrl.toLocalFile();
    if (configPath.isEmpty()) {
        const QString decoded = configUrl.toString(QUrl::PrettyDecoded);
        configPath = decoded.startsWith(QStringLiteral("file://"))
            ? QUrl(decoded).toLocalFile()
            : decoded;
    }
    if (configPath.isEmpty()) {
        configPath = Aurora::Application::getPath(
                           Aurora::Application::PathType::PackageFilesLocation)
            + QStringLiteral("/config/defaults.json");
    }
    return configPath;
}

QJsonObject loadConfigObject()
{
    const QString configPath = resolveConfigPath();
    QFile file(configPath);
    if (!file.open(QIODevice::ReadOnly)) {
        qWarning("[aurobore-container] config/defaults.json not found (%s)",
                 qPrintable(configPath));
        return QJsonObject();
    }

    QJsonParseError parseError;
    const QJsonDocument doc = QJsonDocument::fromJson(file.readAll(), &parseError);
    if (parseError.error != QJsonParseError::NoError || !doc.isObject()) {
        qWarning("[aurobore-container] config/defaults.json parse error: %s",
                 qPrintable(parseError.errorString()));
        return QJsonObject();
    }
    return doc.object();
}

QStringList readStringArray(const QJsonObject &root, const QString &key)
{
    QStringList values;
    const QJsonValue arrayValue = root.value(key);
    if (!arrayValue.isArray())
        return values;
    for (const QJsonValue &item : arrayValue.toArray()) {
        if (item.isString())
            values.append(item.toString());
    }
    return values;
}

} // namespace

const char *AppConfig::kEntryUrl = "aurobore-app://localhost/index.html";
const char *AppConfig::kAppScheme = "aurobore-app";
const char *AppConfig::kAppHost = "localhost";

int AppConfig::splashTimeoutMs()
{
    const QJsonObject root = loadConfigObject();
    const QJsonValue splashValue = root.value(QStringLiteral("app"));
    if (splashValue.isObject()) {
        const QJsonValue timeout = splashValue.toObject()
            .value(QStringLiteral("splash"))
            .toObject()
            .value(QStringLiteral("timeoutMs"));
        if (timeout.isDouble() && timeout.toInt() > 0)
            return timeout.toInt();
    }
    return 10000;
}

QStringList AppConfig::grantedPermissions()
{
    return readStringArray(loadConfigObject(), QStringLiteral("permissions"));
}

QStringList AppConfig::deepLinkSchemes()
{
    const QJsonObject root = loadConfigObject();
    const QJsonValue deepLinksValue = root.value(QStringLiteral("deepLinks"));
    if (!deepLinksValue.isObject())
        return QStringList();
    return readStringArray(deepLinksValue.toObject(), QStringLiteral("schemes"));
}

QString AppConfig::appName()
{
    const QJsonObject root = loadConfigObject();
    const QJsonValue appValue = root.value(QStringLiteral("app"));
    if (!appValue.isObject())
        return QString();
    const QJsonValue name = appValue.toObject().value(QStringLiteral("name"));
    return name.isString() ? name.toString() : QString();
}

QString AppConfig::appId()
{
    const QJsonObject root = loadConfigObject();
    const QJsonValue appValue = root.value(QStringLiteral("app"));
    if (!appValue.isObject())
        return QString();
    const QJsonValue id = appValue.toObject().value(QStringLiteral("id"));
    return id.isString() ? id.toString() : QString();
}

CoverConfig AppConfig::cover()
{
    CoverConfig config;
    const QJsonObject root = loadConfigObject();
    const QJsonValue coverValue = root.value(QStringLiteral("cover"));
    if (!coverValue.isObject())
        return config;

    const QJsonValue actionsValue = coverValue.toObject().value(QStringLiteral("actions"));
    if (!actionsValue.isArray())
        return config;

    for (const QJsonValue &item : actionsValue.toArray()) {
        if (!item.isObject())
            continue;
        const QJsonObject action = item.toObject();
        CoverActionConfig entry;
        entry.id = action.value(QStringLiteral("id")).toString();
        entry.label = action.value(QStringLiteral("label")).toString();
        entry.icon = action.value(QStringLiteral("icon")).toString();
        if (!entry.id.isEmpty() && !entry.label.isEmpty())
            config.actions.append(entry);
    }
    return config;
}

} // namespace Aurobore
