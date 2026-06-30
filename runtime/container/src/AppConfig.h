#ifndef AUROBORE_APP_CONFIG_H
#define AUROBORE_APP_CONFIG_H

#include <QString>
#include <QStringList>

namespace Aurobore {

struct SystemChromeConfig {
    QString insets = QStringLiteral("auto");
    bool overlayWebView = false;
    QString statusBarStyle = QStringLiteral("default");
};

struct AppConfig {
    static const char *kEntryUrl;
    static const char *kAppScheme;
    static const char *kAppHost;
    static int splashTimeoutMs();
    static QStringList grantedPermissions();
    static QStringList deepLinkSchemes();
    static SystemChromeConfig systemChrome();
};

} // namespace Aurobore

#endif
