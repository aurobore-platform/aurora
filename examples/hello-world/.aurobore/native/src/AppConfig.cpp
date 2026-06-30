#include "AppConfig.h"

#include <auroraapp/auroraapp.h>

#include <QtCore/QDebug>
#include <QtCore/QFile>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QUrl>

namespace Aurobore {

const char *AppConfig::kEntryUrl = "aurobore-app://localhost/index.html";
const char *AppConfig::kAppScheme = "aurobore-app";
const char *AppConfig::kAppHost = "localhost";

int AppConfig::splashTimeoutMs()
{
    return 10000;
}

QStringList AppConfig::grantedPermissions()
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

    QFile file(configPath);
    if (!file.open(QIODevice::ReadOnly)) {
        qWarning("[aurobore-container] config/defaults.json not found (%s); no permissions granted",
                 qPrintable(configPath));
        return QStringList();
    }

    QJsonParseError parseError;
    const QJsonDocument doc = QJsonDocument::fromJson(file.readAll(), &parseError);
    if (parseError.error != QJsonParseError::NoError || !doc.isObject()) {
        qWarning("[aurobore-container] config/defaults.json parse error: %s",
                 qPrintable(parseError.errorString()));
        return QStringList();
    }

    const QJsonValue permissionsValue = doc.object().value(QStringLiteral("permissions"));
    if (!permissionsValue.isArray()) {
        qWarning("[aurobore-container] config/defaults.json: permissions must be an array");
        return QStringList();
    }

    QStringList permissions;
    for (const QJsonValue &item : permissionsValue.toArray()) {
        if (item.isString())
            permissions.append(item.toString());
    }
    return permissions;
}

} // namespace Aurobore
