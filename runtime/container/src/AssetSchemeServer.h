#ifndef AUROBORE_ASSET_SCHEME_SERVER_H
#define AUROBORE_ASSET_SCHEME_SERVER_H

#include <QObject>
#include <QString>
#include <QTcpServer>

class AssetResolver;

/**
 * Отдача html/ из sandbox через loopback HTTP.
 *
 * Прямой CefRegisterSchemeHandlerFactory недоступен в aurorawebview-devel (заголовки libcef
 * не поставляются приложению). Loopback origin даёт тот же DX, что https://localhost у Capacitor:
 * path-based History API, относительные URL, единый origin для CSS/JS.
 */
class AssetSchemeServer : public QObject
{
    Q_OBJECT
    Q_PROPERTY(QString baseUrl READ baseUrl NOTIFY baseUrlChanged)
    Q_PROPERTY(QString origin READ origin NOTIFY baseUrlChanged)

public:
    explicit AssetSchemeServer(QObject *parent = nullptr);

    bool start(AssetResolver *resolver);
    void stop();

    QString baseUrl() const { return m_baseUrl; }
    QString origin() const { return m_origin; }
    bool isAllowedUrl(const QString &urlString) const;

signals:
    void baseUrlChanged();

private slots:
    void onNewConnection();

private:
    void handleClient(class QTcpSocket *socket);
    bool sendFile(class QTcpSocket *socket, const QString &localPath);

    QTcpServer m_server;
    AssetResolver *m_resolver = nullptr;
    QString m_baseUrl;
    QString m_origin;
};

#endif
