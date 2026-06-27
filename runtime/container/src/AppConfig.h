#ifndef AUROBORE_APP_CONFIG_H
#define AUROBORE_APP_CONFIG_H

#include <QString>

namespace Aurobore {

struct AppConfig {
    static const char *kEntryUrl;
    static const char *kAppScheme;
    static const char *kAppHost;
    static int splashTimeoutMs();
};

} // namespace Aurobore

#endif
