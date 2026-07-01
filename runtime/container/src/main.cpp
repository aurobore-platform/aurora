// Aurobore M1 — нативный runtime-контейнер.
//
// SDK 5.2.1.200: InitBrowser(argc, argv, additionalArgs) после createView(), до QML с WebView.
// StartProcess/setWebviewParams на 5.2.x не используем (V-4).

#include <vector>
#include <string>

#include <QtCore/QScopedPointer>
#include <QtCore/QDebug>
#include <QtCore/QStandardPaths>
#include <QtGui/QGuiApplication>
#include <QtQml/QQmlContext>
#include <QtQuick/QQuickView>

#include <auroraapp/auroraapp.h>
#include <aurorawebview/webenginecontext.h>

#include "AppConfig.h"
#include "AssetResolver.h"
#include "AssetSchemeServer.h"
#include "LifecycleBridge.h"
#include "DeepLinkHandler.h"
#include "BridgeRouter.h"
#include "LoopbackTlsCredentials.h"
#include "CoverBridge.h"
#include "CoverPlugin.h"

int main(int argc, char *argv[])
{
    QGuiApplication::setAttribute(Qt::AA_ShareOpenGLContexts);

    QScopedPointer<QGuiApplication> application(Aurora::Application::application(argc, argv));
    QScopedPointer<QQuickView> view(Aurora::Application::createView());
    view->setResizeMode(QQuickView::SizeRootObjectToView);

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

    Aurora::WebView::WebEngineContext::InitBrowser(argc, argv, browserArgs);

    AssetSchemeServer assetServer;
    QString entryUrl;
    if (assetServer.start(&assetResolver, &tlsCredentials)) {
        entryUrl = assetServer.baseUrl() + QStringLiteral("/index.html");
    } else {
        entryUrl = QString::fromLatin1(Aurobore::AppConfig::kEntryUrl);
        qWarning("[aurobore-container] AssetSchemeServer failed; fallback entry %s",
                 qPrintable(entryUrl));
    }

    LifecycleBridge lifecycleBridge;
    BridgeRouter bridgeRouter;
    CoverBridge coverBridge(&bridgeRouter);

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
    if (!bridgeRouter.initializePlugins()) {
        qWarning("[aurobore-container] no plugins registered");
    }
    CoverPlugin *coverPlugin =
        new CoverPlugin(&bridgeRouter, &coverBridge);
    bridgeRouter.registerBuiltInPlugin(CoverPlugin::descriptor(), coverPlugin);
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

    auto *rootContext = view->rootContext();
    rootContext->setContextProperty(QStringLiteral("htmlRootPath"), htmlRoot);
    rootContext->setContextProperty(QStringLiteral("assetResolver"), &assetResolver);
    rootContext->setContextProperty(QStringLiteral("assetServerOrigin"), assetServer.origin());
    rootContext->setContextProperty(QStringLiteral("lifecycleBridge"), &lifecycleBridge);
    rootContext->setContextProperty(QStringLiteral("deepLinkHandler"), &deepLinkHandler);
    rootContext->setContextProperty(QStringLiteral("bridgeRouter"), &bridgeRouter);
    rootContext->setContextProperty(QStringLiteral("coverBridge"), &coverBridge);
    rootContext->setContextProperty(QStringLiteral("entryUrl"), entryUrl);
    rootContext->setContextProperty(QStringLiteral("splashTimeoutMs"),
                                    Aurobore::AppConfig::splashTimeoutMs());

    view->setSource(Aurora::Application::pathToMainQml());
    view->show();
    return application->exec();
}
