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

SystemChromeConfig AppConfig::systemChrome()
{
    SystemChromeConfig config;
    const QJsonObject root = loadConfigObject();
    const QJsonValue chromeValue = root.value(QStringLiteral("systemChrome"));
    if (!chromeValue.isObject())
        return config;

    const QJsonObject chrome = chromeValue.toObject();
    const QJsonValue insets = chrome.value(QStringLiteral("insets"));
    if (insets.isString())
        config.insets = insets.toString();
    const QJsonValue overlay = chrome.value(QStringLiteral("overlayWebView"));
    if (overlay.isBool())
        config.overlayWebView = overlay.toBool();
    const QJsonValue statusBarStyle = chrome.value(QStringLiteral("statusBarStyle"));
    if (statusBarStyle.isString())
        config.statusBarStyle = statusBarStyle.toString();
    return config;
}

} // namespace Aurobore
