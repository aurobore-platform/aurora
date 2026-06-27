// Aurobore PoC — точка входа нативного контейнера.
//
// SDK 5.2.1.200: CEF инициализируется через Aurora::WebView::WebEngineContext::InitBrowser()
// (см. /usr/include/aurorawebview/webenginecontext.h). Вызов — ПОСЛЕ createView(), ДО загрузки
// QML с WebView. StartProcess/setWebviewParams в публичном API 5.2.x заменены InitBrowser(argc,...).

#include <vector>
#include <string>

#include <QtCore/QScopedPointer>
#include <QtGui/QGuiApplication>
#include <QtQml/QQmlContext>
#include <QtQuick/QQuickView>

#include <auroraapp/auroraapp.h>
#include <aurorawebview/webenginecontext.h>

int main(int argc, char *argv[])
{
    QGuiApplication::setAttribute(Qt::AA_ShareOpenGLContexts);

    QScopedPointer<QGuiApplication> application(Aurora::Application::application(argc, argv));
    QScopedPointer<QQuickView> view(Aurora::Application::createView());
    view->setResizeMode(QQuickView::SizeRootObjectToView);

    // Инициализация CEF/WebView до загрузки QML (иначе: must call setWebviewParams before initBrowser).
    Aurora::WebView::WebEngineContext::InitBrowser(
        argc, argv,
        std::vector<std::string>{"--default-encoding=UTF-8"});

    const QUrl htmlRoot = Aurora::Application::pathTo(QStringLiteral("html"));
    view->rootContext()->setContextProperty(QStringLiteral("htmlRootPath"),
                                             htmlRoot.toString(QUrl::PrettyDecoded));

    view->setSource(Aurora::Application::pathToMainQml());
    view->show();
    return application->exec();
}
