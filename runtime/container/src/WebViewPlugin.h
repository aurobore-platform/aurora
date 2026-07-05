#ifndef AUROBORE_WEBVIEW_PLUGIN_H
#define AUROBORE_WEBVIEW_PLUGIN_H

#include "IPlugin.h"
#include "PluginDescriptor.h"

class WebViewAuthBridge;
class WebViewCookieBridge;

class WebViewPlugin : public IPlugin
{
    Q_OBJECT

public:
    WebViewPlugin(BridgeRouter *router, WebViewAuthBridge *authBridge,
                  WebViewCookieBridge *cookieBridge, QObject *parent = nullptr);

    QString displayName() const override;
    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;

    static PluginDescriptor descriptor();

private:
    WebViewAuthBridge *m_authBridge = nullptr;
    WebViewCookieBridge *m_cookieBridge = nullptr;
};

IPlugin *createWebViewPlugin(BridgeRouter *router, WebViewAuthBridge *authBridge,
                             WebViewCookieBridge *cookieBridge);

#endif
