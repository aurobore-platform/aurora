#ifndef AUROBORE_WEBVIEW_AUTH_BRIDGE_H
#define AUROBORE_WEBVIEW_AUTH_BRIDGE_H

#include <QObject>
#include <QString>
#include <QStringList>
#include <QVariant>

class BridgeRouter;

class WebViewAuthBridge : public QObject
{
    Q_OBJECT

public:
    explicit WebViewAuthBridge(BridgeRouter *router, QObject *parent = nullptr);
    ~WebViewAuthBridge() override;

    void setAllowedOrigins(const QStringList &origins);
    void initialize(class QQmlEngine *engine);

    Q_INVOKABLE bool provideAuth(const QString &requestId, const QString &username,
                                 const QString &password);
    Q_INVOKABLE bool cancelAuth(const QString &requestId = QString());

signals:
    void authRequested(const QString &requestId, const QString &host, const QString &realm);
    void authResolved();

private:
    struct Private;
    Private *d = nullptr;
};

#endif
