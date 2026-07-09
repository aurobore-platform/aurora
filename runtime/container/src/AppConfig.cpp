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

QString resolvePackagePath(const QString &relative)
{
    if (relative.isEmpty())
        return QString();

    const QUrl configUrl = Aurora::Application::pathTo(relative);
    QString localPath = configUrl.toLocalFile();
    if (localPath.isEmpty()) {
        const QString decoded = configUrl.toString(QUrl::PrettyDecoded);
        localPath = decoded.startsWith(QStringLiteral("file://"))
            ? QUrl(decoded).toLocalFile()
            : decoded;
    }
    if (localPath.isEmpty()) {
        localPath = Aurora::Application::getPath(
                          Aurora::Application::PathType::PackageFilesLocation)
            + QLatin1Char('/') + relative;
    }
    return QFile::exists(localPath) ? localPath : QString();
}

QJsonObject readAppObject()
{
    const QJsonObject root = loadConfigObject();
    const QJsonValue appValue = root.value(QStringLiteral("app"));
    return appValue.isObject() ? appValue.toObject() : QJsonObject();
}

QJsonObject readSplashObject()
{
    return readAppObject().value(QStringLiteral("splash")).toObject();
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

QString AppConfig::appVersion()
{
    const QJsonObject root = loadConfigObject();
    const QJsonValue appValue = root.value(QStringLiteral("app"));
    if (!appValue.isObject())
        return QString();
    const QJsonValue version = appValue.toObject().value(QStringLiteral("version"));
    return version.isString() ? version.toString() : QString();
}

QStringList AppConfig::allowedOrigins()
{
    const QJsonObject root = loadConfigObject();
    const QJsonValue webValue = root.value(QStringLiteral("web"));
    if (!webValue.isObject())
        return QStringList();
    return readStringArray(webValue.toObject(), QStringLiteral("allowedOrigins"));
}

CoverConfig AppConfig::cover()
{
    CoverConfig config;
    const QJsonObject root = loadConfigObject();
    const QJsonValue coverValue = root.value(QStringLiteral("cover"));
    if (!coverValue.isObject())
        return config;

    const QJsonObject coverObj = coverValue.toObject();
    const QJsonValue modeValue = coverObj.value(QStringLiteral("mode"));
    if (modeValue.isString() && !modeValue.toString().isEmpty())
        config.mode = modeValue.toString();

    const QJsonValue actionsValue = coverObj.value(QStringLiteral("actions"));
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

SplashConfig AppConfig::splash()
{
    SplashConfig config;
    const QJsonObject splashObj = readSplashObject();
    if (splashObj.isEmpty())
        return config;

    config.background = splashObj.value(QStringLiteral("background")).toString();
    config.gradientStart = splashObj.value(QStringLiteral("gradientStart")).toString();
    config.gradientEnd = splashObj.value(QStringLiteral("gradientEnd")).toString();
    config.packageImage = splashObj.value(QStringLiteral("packageImage")).toString();
    config.showName = splashObj.value(QStringLiteral("showName")).toBool(false);
    return config;
}

QString AppConfig::splashGradientStart()
{
    const SplashConfig config = splash();
    if (!config.gradientStart.isEmpty())
        return config.gradientStart;
    if (!config.background.isEmpty())
        return config.background;
    return QStringLiteral("#1a1a2e");
}

QString AppConfig::splashGradientEnd()
{
    const SplashConfig config = splash();
    if (!config.gradientEnd.isEmpty())
        return config.gradientEnd;
    if (!config.background.isEmpty())
        return config.background;
    return splashGradientStart();
}

QString AppConfig::appIconPath()
{
    const QString id = appId();
    if (id.isEmpty())
        return QString();

    static const char *kSizes[] = {"172x172", "128x128", "108x108", "86x86"};
    for (const char *size : kSizes) {
        const QString rel = QStringLiteral("icons/%1/%2.png")
            .arg(QString::fromLatin1(size), id);
        const QString path = resolvePackagePath(rel);
        if (!path.isEmpty())
            return path;
    }
    return QString();
}

QString AppConfig::coverMode()
{
    const CoverConfig config = cover();
    return config.mode.isEmpty() ? QStringLiteral("template") : config.mode;
}

QString AppConfig::splashImagePath()
{
    const SplashConfig config = splash();
    if (config.packageImage.isEmpty())
        return QString();
    return resolvePackagePath(config.packageImage);
}

UpdatesConfig AppConfig::updates()
{
    UpdatesConfig config;
    const QJsonObject root = loadConfigObject();
    const QJsonValue updatesValue = root.value(QStringLiteral("updates"));
    if (!updatesValue.isObject())
        return config;

    const QJsonObject updates = updatesValue.toObject();
    config.enabled = updates.value(QStringLiteral("enabled")).toBool(false);
    config.url = updates.value(QStringLiteral("url")).toString();
    config.channel = updates.value(QStringLiteral("channel")).toString(QStringLiteral("stable"));
    config.publicKey = updates.value(QStringLiteral("publicKey")).toString();
    config.checkOnResume = updates.value(QStringLiteral("checkOnResume")).toBool(true);
    const QJsonValue interval = updates.value(QStringLiteral("checkIntervalMs"));
    if (interval.isDouble() && interval.toInt() >= 60000)
        config.checkIntervalMs = interval.toInt();
    return config;
}

} // namespace Aurobore
