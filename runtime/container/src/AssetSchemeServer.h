#ifndef AUROBORE_ASSET_SCHEME_SERVER_H
#define AUROBORE_ASSET_SCHEME_SERVER_H

#include <QObject>
#include <QString>

class QTcpServer;
class AssetResolver;
class LoopbackTlsCredentials;
class QAbstractSocket;

/**
 * Отдача html/ из sandbox через loopback HTTPS.
 *
 * Прямой CefRegisterSchemeHandlerFactory недоступен в aurorawebview-devel (заголовки libcef
 * не поставляются приложению). Loopback origin даёт тот же DX, что https://localhost у Capacitor:
 * path-based History API, относительные URL, единый origin для CSS/JS, secure context.
 */
class AssetSchemeServer : public QObject
{
    Q_OBJECT
    Q_PROPERTY(QString baseUrl READ baseUrl NOTIFY baseUrlChanged)
    Q_PROPERTY(QString origin READ origin NOTIFY baseUrlChanged)

public:
    explicit AssetSchemeServer(QObject *parent = nullptr);
    ~AssetSchemeServer() override;

    bool start(AssetResolver *resolver, const LoopbackTlsCredentials *tls);
    void stop();

    QString baseUrl() const { return m_baseUrl; }
    QString origin() const { return m_origin; }
    bool isAllowedUrl(const QString &urlString) const;
    bool usesTls() const { return m_usesTls; }

signals:
    void baseUrlChanged();

private:
    void onNewConnection();
    void handleClient(QAbstractSocket *socket);
    bool sendFile(QAbstractSocket *socket, const QString &localPath);

    QTcpServer *m_server = nullptr;
    AssetResolver *m_resolver = nullptr;
    QString m_baseUrl;
    QString m_origin;
    bool m_usesTls = false;
};

#endif
