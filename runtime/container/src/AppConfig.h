#ifndef AUROBORE_APP_CONFIG_H
#define AUROBORE_APP_CONFIG_H

#include <QString>
#include <QStringList>

namespace Aurobore {

struct CoverActionConfig {
    QString id;
    QString label;
    QString icon;
};

struct CoverConfig {
    QString mode = QStringLiteral("template");
    QList<CoverActionConfig> actions;
};

struct SplashConfig {
    QString background;
    QString gradientStart;
    QString gradientEnd;
    QString packageImage;
    bool showName = false;
};

struct UpdatesConfig {
    bool enabled = false;
    QString url;
    QString channel = QStringLiteral("stable");
    QString publicKey;
    bool checkOnResume = true;
    int checkIntervalMs = 3600000;
};

struct AppConfig {
    static const char *kEntryUrl;
    static const char *kAppScheme;
    static const char *kAppHost;
    static int splashTimeoutMs();
    static QString appName();
    static QString appId();
    static QString appVersion();
    static QStringList grantedPermissions();
    static QStringList deepLinkSchemes();
    static QStringList allowedOrigins();
    static CoverConfig cover();
    static UpdatesConfig updates();
    static SplashConfig splash();
    static QString splashGradientStart();
    static QString splashGradientEnd();
    static QString appIconPath();
    static QString splashImagePath();
    static QString coverMode();
};

} // namespace Aurobore

#endif
