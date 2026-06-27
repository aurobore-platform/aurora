#include "AppConfig.h"

namespace Aurobore {

const char *AppConfig::kEntryUrl = "aurobore-app://localhost/index.html";
const char *AppConfig::kAppScheme = "aurobore-app";
const char *AppConfig::kAppHost = "localhost";

int AppConfig::splashTimeoutMs()
{
    return 10000;
}

} // namespace Aurobore
