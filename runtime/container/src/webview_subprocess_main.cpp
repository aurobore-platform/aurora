#include <aurorawebview/webenginecontext.h>

int main(int argc, char **argv)
{
#if defined(AUROBORE_WEBVIEW_HAS_START_SUBPROCESS)
    return Aurora::WebView::WebEngineContext::StartSubprocess(argc, argv);
#else
    Aurora::WebView::WebEngineContext::StartProcess(argc, argv);
    return 0;
#endif
}
