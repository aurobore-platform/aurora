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
#include "BridgeRouter.h"
#include "LoopbackTlsCredentials.h"

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
    bridgeRouter.setGrantedPermissions(Aurobore::AppConfig::grantedPermissions());
    if (!bridgeRouter.initializePlugins()) {
        qWarning("[aurobore-container] no plugins registered");
    }
    QObject::connect(
        application.data(), &QGuiApplication::applicationStateChanged,
        &lifecycleBridge, &LifecycleBridge::onApplicationStateChanged);
    QObject::connect(
        &lifecycleBridge, &LifecycleBridge::lifecycleEvent,
        &bridgeRouter, [&bridgeRouter](const QString &event) {
            bridgeRouter.emitEvent(event);
        });

    auto *rootContext = view->rootContext();
    rootContext->setContextProperty(QStringLiteral("htmlRootPath"), htmlRoot);
    rootContext->setContextProperty(QStringLiteral("assetResolver"), &assetResolver);
    rootContext->setContextProperty(QStringLiteral("assetServerOrigin"), assetServer.origin());
    rootContext->setContextProperty(QStringLiteral("lifecycleBridge"), &lifecycleBridge);
    rootContext->setContextProperty(QStringLiteral("bridgeRouter"), &bridgeRouter);
    rootContext->setContextProperty(QStringLiteral("entryUrl"), entryUrl);
    rootContext->setContextProperty(QStringLiteral("splashTimeoutMs"),
                                    Aurobore::AppConfig::splashTimeoutMs());

    view->setSource(Aurora::Application::pathToMainQml());
    view->show();
    return application->exec();
}
