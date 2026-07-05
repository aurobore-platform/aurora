#ifndef AUROBORE_WEBVIEW_COOKIE_BRIDGE_H
#define AUROBORE_WEBVIEW_COOKIE_BRIDGE_H

#include <QObject>
#include <QString>
#include <QStringList>

class BridgeRouter;

class WebViewCookieBridge : public QObject
{
    Q_OBJECT

public:
    explicit WebViewCookieBridge(BridgeRouter *router, QObject *parent = nullptr);
    ~WebViewCookieBridge() override;

    void setAllowedOrigins(const QStringList &origins);
    void initialize(class QQmlEngine *engine);

    bool requestSetCookie(const QString &domain, const QString &path, const QString &name,
                          const QString &value, const QString &invokeId);
    bool clearCookies();

    Q_INVOKABLE void setCookie(const QString &domain, const QString &path,
                               const QString &name, const QString &value);
    Q_INVOKABLE bool clearAllCookies();
    Q_INVOKABLE void completeSetCookie(const QString &invokeId, bool success);

signals:
    void cookieSet(bool success);
    void setCookieRequested(const QString &domain, const QString &path, const QString &name,
                            const QString &value, const QString &invokeId);

private:
    bool isDomainAllowed(const QString &domain) const;
    bool validateCookieArgs(const QString &domain, const QString &path,
                            const QString &name, QString *errorMessage) const;
    void finishSetCookie(const QString &invokeId, bool success);

    struct Private;
    Private *d = nullptr;
};

#endif
