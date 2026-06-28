#ifndef AUROBORE_APP_CONFIG_H
#define AUROBORE_APP_CONFIG_H

#include <QString>
#include <QStringList>

namespace Aurobore {

struct AppConfig {
    static const char *kEntryUrl;
    static const char *kAppScheme;
    static const char *kAppHost;
    static int splashTimeoutMs();
    static QStringList grantedPermissions();
};

} // namespace Aurobore

#endif
