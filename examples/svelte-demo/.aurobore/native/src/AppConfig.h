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
    QList<CoverActionConfig> actions;
};

struct AppConfig {
    static const char *kEntryUrl;
    static const char *kAppScheme;
    static const char *kAppHost;
    static int splashTimeoutMs();
    static QString appName();
    static QStringList grantedPermissions();
    static QStringList deepLinkSchemes();
    static CoverConfig cover();
};

} // namespace Aurobore

#endif
