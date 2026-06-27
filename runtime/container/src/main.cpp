// Aurobore M1 — нативный runtime-контейнер.
//
// SDK 5.2.1.200: InitBrowser(argc, argv, additionalArgs) после createView(), до QML с WebView.
// StartProcess/setWebviewParams на 5.2.x не используем (V-4).

#include <vector>
#include <string>

#include <QtCore/QScopedPointer>
#include <QtGui/QGuiApplication>
#include <QtQml/QQmlContext>
#include <QtQuick/QQuickView>

#include <auroraapp/auroraapp.h>
#include <aurorawebview/webenginecontext.h>

#include "AppConfig.h"
#include "AssetResolver.h"
#include "LifecycleBridge.h"

int main(int argc, char *argv[])
{
    QGuiApplication::setAttribute(Qt::AA_ShareOpenGLContexts);

    QScopedPointer<QGuiApplication> application(Aurora::Application::application(argc, argv));
    QScopedPointer<QQuickView> view(Aurora::Application::createView());
    view->setResizeMode(QQuickView::SizeRootObjectToView);

    Aurora::WebView::WebEngineContext::InitBrowser(
        argc, argv,
        std::vector<std::string>{"--default-encoding=UTF-8"});

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

    LifecycleBridge lifecycleBridge;
    QObject::connect(
        application.data(), &QGuiApplication::applicationStateChanged,
        &lifecycleBridge, &LifecycleBridge::onApplicationStateChanged);

    auto *rootContext = view->rootContext();
    rootContext->setContextProperty(QStringLiteral("htmlRootPath"), htmlRoot);
    rootContext->setContextProperty(QStringLiteral("assetResolver"), &assetResolver);
    rootContext->setContextProperty(QStringLiteral("lifecycleBridge"), &lifecycleBridge);
    rootContext->setContextProperty(QStringLiteral("entryUrl"),
                                    QString::fromLatin1(Aurobore::AppConfig::kEntryUrl));
    rootContext->setContextProperty(QStringLiteral("splashTimeoutMs"),
                                    Aurobore::AppConfig::splashTimeoutMs());

    view->setSource(Aurora::Application::pathToMainQml());
    view->show();
    return application->exec();
}
