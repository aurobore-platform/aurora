// Aurobore M1 — нативный runtime-контейнер.
//
// SDK 5.2.1.200: InitBrowser(argc, argv, additionalArgs) после createView(), до QML с WebView.
// StartProcess/setWebviewParams на 5.2.x не используем (V-4).

#include <vector>
#include <string>

#include <QtCore/QScopedPointer>
#include <QtCore/QDebug>
#include <QtCore/QStandardPaths>
#include <QtCore/QMap>
#include <QtCore/QVariant>
#include <QtGui/QGuiApplication>
#include <QtQml/QQmlContext>
#include <QtQuick/QQuickView>

#include <QtCrypto>

#include <auroraapp/auroraapp.h>
#include <aurorawebview/webenginecontext.h>

#include "AppConfig.h"
#include "AssetResolver.h"
#include "AssetSchemeServer.h"
#include "LifecycleBridge.h"
#include "DeepLinkHandler.h"
#include "BridgeRouter.h"
#include "WebViewAuthBridge.h"
#include "WebViewCookieBridge.h"
#include "WebViewPlugin.h"
#include "LoopbackTlsCredentials.h"
#include "CoverBridge.h"
#include "CoverPlugin.h"
#include "CameraBridge.h"
#include "CameraPlugin.h"
#include "NotificationsBridge.h"
#include "NotificationsPlugin.h"
#include "ShareBridge.h"
#include "SharePlugin.h"

int main(int argc, char *argv[])
{
    QGuiApplication::setAttribute(Qt::AA_ShareOpenGLContexts);

    QScopedPointer<QGuiApplication> application(Aurora::Application::application(argc, argv));
    QScopedPointer<QQuickView> view(Aurora::Application::createView());
    view->setResizeMode(QQuickView::SizeRootObjectToView);

    static QCA::Initializer qcaInitializer;
    qInfo("[aurobore-container] InitQCA: QCA::Initializer ready");

    AssetResolver assetResolver;
    const QUrl htmlRootUrl = Aurora::Application::pathTo(QStringLiteral("html"));
    QString htmlRoot = htmlRootUrl.toLocalFile();
    if (htmlRoot.isEmpty()) {
        const QString decoded = htmlRootUrl.toString(QUrl::PrettyDecoded);
        htmlRoot = decoded.startsWith(QStringLiteral("file://"))
            ? QUrl(decoded).toLocalFile()
            : decoded;
    }
    if (htmlRoot.isEmpty()) {
        htmlRoot = Aurora::Application::getPath(
                       Aurora::Application::PathType::PackageFilesLocation)
            + QStringLiteral("/html");
    }
    assetResolver.setWebRoot(htmlRoot);

    const QString appDataRoot =
        QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    if (!appDataRoot.isEmpty())
        assetResolver.setAppDataRoot(appDataRoot);

    LoopbackTlsCredentials tlsCredentials;
    tlsCredentials.loadFromPackage();

    std::vector<std::string> browserArgs = {"--default-encoding=UTF-8"};
    if (tlsCredentials.isValid()) {
        const std::string fingerprint = tlsCredentials.spkiFingerprintBase64().toStdString();
        browserArgs.push_back("--ignore-certificate-errors=" + fingerprint);
        qInfo("[aurobore-container] InitBrowser: trust loopback SPKI fingerprint");
    }

    const QByteArray cefDebugPortEnv = qgetenv("AUROBORE_CEF_DEBUG_PORT");
    if (!cefDebugPortEnv.isEmpty()) {
        bool ok = false;
        const int cefDebugPort = cefDebugPortEnv.toInt(&ok);
        if (ok && cefDebugPort > 0 && cefDebugPort <= 65535) {
            browserArgs.push_back("--remote-debugging-port=" + std::to_string(cefDebugPort));
            browserArgs.push_back("--remote-allow-origins=*");
            qInfo("[aurobore] InitBrowser: remote debugging on 127.0.0.1:%d", cefDebugPort);
        } else {
            qWarning("[aurobore] AUROBORE_CEF_DEBUG_PORT invalid: %s",
                     cefDebugPortEnv.constData());
        }
    }

#ifdef AUROBORE_WEBVIEW_HAS_START_SUBPROCESS
    browserArgs.push_back(
        std::string("--browser-subprocess-path=" WEBVIEW_SUBPROCESS_LAUNCHER_INSTALL_PATH));
    qInfo("[aurobore-container] InitBrowser: subprocess %s",
          WEBVIEW_SUBPROCESS_LAUNCHER_INSTALL_PATH);
#endif

    QMap<QString, QString> webViewParams;
#ifdef WEBVIEW_CRYPTOPRO_CHECKER_INSTALL_PATH
    webViewParams.insert(QStringLiteral("cryptopro-checker-path"),
                         QStringLiteral(WEBVIEW_CRYPTOPRO_CHECKER_INSTALL_PATH));
#endif

    Aurora::WebView::WebEngineContext::InitBrowser(argc, argv, browserArgs, webViewParams);

    AssetSchemeServer assetServer;
    QString entryUrl;
    if (assetServer.start(&assetResolver, &tlsCredentials)) {
        entryUrl = assetServer.baseUrl() + QStringLiteral("/index.html");
    } else {
        entryUrl = QString::fromLatin1(Aurobore::AppConfig::kEntryUrl);
        qWarning("[aurobore-container] AssetSchemeServer failed; fallback entry %s",
                 qPrintable(entryUrl));
    }
    QVariantList webViewHarnessModes;
    if (qgetenv("AUROBORE_W3_EXTERNAL") == QByteArray("1")) {
        webViewHarnessModes.append(QStringLiteral("w3"));
        qInfo("[aurobore-container] W3 external test enabled (see web.allowedOrigins)");
    }
    if (qgetenv("AUROBORE_W4_AUTH") == QByteArray("1")) {
        webViewHarnessModes.append(QStringLiteral("w4"));
        qInfo("[aurobore-container] W4 auth test enabled (see web.allowedOrigins)");
    }
    if (qgetenv("AUROBORE_W5_COOKIES") == QByteArray("1")) {
        webViewHarnessModes.append(QStringLiteral("w5"));
        qInfo("[aurobore-container] W5 cookie test enabled (see web.allowedOrigins)");
    }
    if (qgetenv("AUROBORE_W6_DISPOSE") == QByteArray("1")) {
        webViewHarnessModes.append(QStringLiteral("w6"));
        qInfo("[aurobore-container] W6 dispose test enabled");
    }

    LifecycleBridge lifecycleBridge;
    BridgeRouter bridgeRouter;
    WebViewAuthBridge webViewAuthBridge(&bridgeRouter);
    WebViewCookieBridge webViewCookieBridge(&bridgeRouter);
    CoverBridge coverBridge(&bridgeRouter);
    CameraBridge cameraBridge;
    NotificationsBridge notificationsBridge;
    ShareBridge shareBridge;

    const Aurobore::CoverConfig coverConfig = Aurobore::AppConfig::cover();
    QVariantList defaultCoverActions;
    for (const Aurobore::CoverActionConfig &action : coverConfig.actions) {
        QVariantMap entry;
        entry.insert(QStringLiteral("id"), action.id);
        entry.insert(QStringLiteral("label"), action.label);
        if (!action.icon.isEmpty())
            entry.insert(QStringLiteral("icon"), action.icon);
        defaultCoverActions.append(entry);
    }
    coverBridge.setDefaultAppName(Aurobore::AppConfig::appName());
    coverBridge.setDefaultActions(defaultCoverActions);
    coverBridge.initializeFromDefaults();

    DeepLinkHandler deepLinkHandler(&bridgeRouter);
    deepLinkHandler.setSchemes(Aurobore::AppConfig::deepLinkSchemes());
    deepLinkHandler.captureFromArguments(application->arguments());
    bridgeRouter.setGrantedPermissions(Aurobore::AppConfig::grantedPermissions());
    CameraPlugin::setCameraBridge(&cameraBridge);
    notificationsBridge.initialize(Aurobore::AppConfig::appId(), &bridgeRouter);
    NotificationsPlugin::setNotificationsBridge(&notificationsBridge);
    SharePlugin::setShareBridge(&shareBridge);
    if (!bridgeRouter.initializePlugins()) {
        qWarning("[aurobore-container] no plugins registered");
    }
    CoverPlugin *coverPlugin =
        new CoverPlugin(&bridgeRouter, &coverBridge);
    bridgeRouter.registerBuiltInPlugin(CoverPlugin::descriptor(), coverPlugin);
    webViewAuthBridge.setAllowedOrigins(Aurobore::AppConfig::allowedOrigins());
    webViewCookieBridge.setAllowedOrigins(Aurobore::AppConfig::allowedOrigins());
    WebViewPlugin *webViewPlugin =
        new WebViewPlugin(&bridgeRouter, &webViewAuthBridge, &webViewCookieBridge);
    bridgeRouter.registerBuiltInPlugin(WebViewPlugin::descriptor(), webViewPlugin);
    QObject::connect(
        application.data(), &QGuiApplication::applicationStateChanged,
        &lifecycleBridge, &LifecycleBridge::onApplicationStateChanged);
    QObject::connect(
        &lifecycleBridge, &LifecycleBridge::lifecycleEvent,
        &bridgeRouter, [&bridgeRouter](const QString &event) {
            bridgeRouter.emitEvent(event);
        });
    QObject::connect(
        &lifecycleBridge, &LifecycleBridge::lifecycleEvent,
        &coverBridge, [&coverBridge](const QString &event) {
            if (event == QStringLiteral("pause"))
                coverBridge.setAppPaused(true);
            else if (event == QStringLiteral("resume"))
                coverBridge.onResume();
        });
    QObject::connect(
        &lifecycleBridge, &LifecycleBridge::lifecycleEvent,
        &deepLinkHandler, [&deepLinkHandler, &application](const QString &event) {
            if (event == QStringLiteral("resume"))
                deepLinkHandler.captureFromArguments(application->arguments());
        });

    const QStringList allowedOrigins = Aurobore::AppConfig::allowedOrigins();
    QVariantList allowedOriginsList;
    for (const QString &origin : allowedOrigins)
        allowedOriginsList.append(origin);

    auto *rootContext = view->rootContext();
    rootContext->setContextProperty(QStringLiteral("htmlRootPath"), htmlRoot);
    rootContext->setContextProperty(QStringLiteral("assetResolver"), &assetResolver);
    rootContext->setContextProperty(QStringLiteral("assetServerOrigin"), assetServer.origin());
    rootContext->setContextProperty(QStringLiteral("lifecycleBridge"), &lifecycleBridge);
    rootContext->setContextProperty(QStringLiteral("deepLinkHandler"), &deepLinkHandler);
    rootContext->setContextProperty(QStringLiteral("bridgeRouter"), &bridgeRouter);
    rootContext->setContextProperty(QStringLiteral("webViewAuthBridge"), &webViewAuthBridge);
    rootContext->setContextProperty(QStringLiteral("webViewCookieBridge"), &webViewCookieBridge);
    rootContext->setContextProperty(QStringLiteral("coverBridge"), &coverBridge);
    rootContext->setContextProperty(QStringLiteral("cameraBridge"), &cameraBridge);
    rootContext->setContextProperty(QStringLiteral("notificationsBridge"), &notificationsBridge);
    rootContext->setContextProperty(QStringLiteral("shareBridge"), &shareBridge);
    rootContext->setContextProperty(QStringLiteral("entryUrl"), entryUrl);
    rootContext->setContextProperty(QStringLiteral("webViewHarnessModes"), webViewHarnessModes);
    rootContext->setContextProperty(QStringLiteral("allowedOrigins"), allowedOriginsList);
    rootContext->setContextProperty(QStringLiteral("splashTimeoutMs"),
                                    Aurobore::AppConfig::splashTimeoutMs());

    static bool cefShutdownDone = false;
    QObject::connect(application.data(), &QGuiApplication::aboutToQuit, [&]() {
        bridgeRouter.emitEvent(QStringLiteral("destroy"), QVariantMap());
        assetServer.stop();
        if (!cefShutdownDone) {
            Aurora::WebView::WebEngineContext::Shutdown();
            cefShutdownDone = true;
            qInfo("[aurobore-container] WebEngineContext::Shutdown complete");
        }
    });

    view->setSource(Aurora::Application::pathToMainQml());
    webViewAuthBridge.initialize(view->engine());
    webViewCookieBridge.initialize(view->engine());
    view->show();
    return application->exec();
}
