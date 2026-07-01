#include "AssetSchemeServer.h"

#include "AppConfig.h"
#include "AssetResolver.h"
#include "LoopbackTlsCredentials.h"

#include <QByteArray>
#include <QFile>
#include <QHostAddress>
#include <QIODevice>
#include <QAbstractSocket>
#include <QSslCertificate>
#include <QSslKey>
#include <QSslSocket>
#include <QTcpServer>
#include <QTcpSocket>
#include <QUrl>
#include <QDebug>

namespace {

QString httpStatusText(int code)
{
    switch (code) {
    case 200:
        return QStringLiteral("OK");
    case 403:
        return QStringLiteral("Forbidden");
    case 404:
        return QStringLiteral("Not Found");
    case 405:
        return QStringLiteral("Method Not Allowed");
    default:
        return QStringLiteral("Error");
    }
}

void writeResponse(QIODevice *socket, int code, const QByteArray &body, const QByteArray &contentType)
{
    const QByteArray status = httpStatusText(code).toUtf8();
    QByteArray response;
    response += "HTTP/1.1 " + QByteArray::number(code) + ' ' + status + "\r\n";
    response += "Content-Type: " + contentType + "\r\n";
    response += "Content-Length: " + QByteArray::number(body.size()) + "\r\n";
    response += "Connection: close\r\n";
    response += "Cache-Control: no-cache\r\n";
    response += "\r\n";
    response += body;
    socket->write(response);
    if (auto *abstract = qobject_cast<QAbstractSocket *>(socket)) {
        abstract->flush();
        abstract->disconnectFromHost();
    }
}

class TlsTcpServer : public QTcpServer
{
public:
    explicit TlsTcpServer(QObject *parent = nullptr)
        : QTcpServer(parent)
    {
    }

    void setTlsCredentials(const QSslCertificate &cert, const QSslKey &key, bool enabled)
    {
        m_cert = cert;
        m_key = key;
        m_tlsEnabled = enabled && !cert.isNull() && !key.isNull();
    }

protected:
    void incomingConnection(qintptr socketDescriptor) override
    {
        if (!m_tlsEnabled) {
            QTcpServer::incomingConnection(socketDescriptor);
            return;
        }

        auto *socket = new QSslSocket(this);
        socket->setLocalCertificate(m_cert);
        socket->setPrivateKey(m_key);
        socket->setSocketDescriptor(socketDescriptor);
        addPendingConnection(socket);
        socket->startServerEncryption();
    }

private:
    QSslCertificate m_cert;
    QSslKey m_key;
    bool m_tlsEnabled = false;
};

} // namespace

AssetSchemeServer::AssetSchemeServer(QObject *parent)
    : QObject(parent)
    , m_server(new TlsTcpServer(this))
{
    connect(m_server, &TlsTcpServer::newConnection, this, &AssetSchemeServer::onNewConnection);
}

AssetSchemeServer::~AssetSchemeServer() = default;

bool AssetSchemeServer::start(AssetResolver *resolver, const LoopbackTlsCredentials *tls)
{
    if (!resolver || resolver->webRoot().isEmpty())
        return false;

    m_resolver = resolver;
    m_usesTls = false;

    if (m_server->isListening())
        m_server->close();

    const bool wantTls = tls && tls->isValid() && QSslSocket::supportsSsl();
    if (wantTls) {
        static_cast<TlsTcpServer *>(m_server)->setTlsCredentials(tls->certificate(), tls->privateKey(), true);
        m_usesTls = true;
    } else {
        if (tls && tls->isValid() && !QSslSocket::supportsSsl())
            qWarning("[aurobore-container] AssetSchemeServer: QSslSocket unavailable, HTTP fallback");
        else if (!tls || !tls->isValid())
            qWarning("[aurobore-container] AssetSchemeServer: TLS credentials missing, HTTP fallback");
        static_cast<TlsTcpServer *>(m_server)->setTlsCredentials(QSslCertificate(), QSslKey(), false);
    }

    if (!m_server->listen(QHostAddress::LocalHost, 0)) {
        qWarning("[aurobore-container] AssetSchemeServer: listen failed");
        return false;
    }

    const quint16 port = m_server->serverPort();
    const QString scheme = m_usesTls ? QStringLiteral("https") : QStringLiteral("http");
    m_baseUrl = scheme + QStringLiteral("://127.0.0.1:") + QString::number(port);
    m_origin = m_baseUrl;
    emit baseUrlChanged();

    qInfo("[aurobore-container] AssetSchemeServer: %s (webRoot=%s, tls=%s)",
          qPrintable(m_baseUrl),
          qPrintable(resolver->webRoot()),
          m_usesTls ? "yes" : "no");
    return true;
}

void AssetSchemeServer::stop()
{
    if (m_server->isListening())
        m_server->close();
}

bool AssetSchemeServer::isAllowedUrl(const QString &urlString) const
{
    if (m_origin.isEmpty())
        return false;
    return urlString.startsWith(m_origin);
}

void AssetSchemeServer::onNewConnection()
{
    while (m_server->hasPendingConnections()) {
        QAbstractSocket *socket = m_server->nextPendingConnection();
        if (!socket)
            continue;

        if (auto *sslSocket = qobject_cast<QSslSocket *>(socket)) {
            connect(sslSocket, &QSslSocket::encrypted, socket, [this, sslSocket]() {
                handleClient(sslSocket);
            });
        } else {
            handleClient(socket);
        }
    }
}

void AssetSchemeServer::handleClient(QAbstractSocket *socket)
{
    if (!socket || !m_resolver) {
        if (socket)
            socket->deleteLater();
        return;
    }

    connect(socket, &QIODevice::readyRead, socket, [this, socket]() {
        const QByteArray request = socket->peek(4096);
        const int headerEnd = request.indexOf("\r\n\r\n");
        if (headerEnd < 0)
            return;

        socket->read(headerEnd + 4);

        const QString firstLine = QString::fromUtf8(request.left(request.indexOf('\n'))).trimmed();
        const QStringList parts = firstLine.split(QLatin1Char(' '));
        if (parts.size() < 2 || parts.at(0) != QLatin1String("GET")) {
            writeResponse(socket, 405, QByteArray(), "text/plain");
            socket->deleteLater();
            return;
        }

        const QUrl parsed(parts.at(1));
        QString path = parsed.path();
        if (path.isEmpty() || path == QLatin1String("/"))
            path = QStringLiteral("/index.html");

        const QString schemeUrl = QString::fromLatin1(Aurobore::AppConfig::kAppScheme)
            + QStringLiteral("://")
            + QString::fromLatin1(Aurobore::AppConfig::kAppHost)
            + path;

        const QString localPath = m_resolver->toFilesystemPath(schemeUrl);
        if (localPath.isEmpty()) {
            qWarning("[aurobore-container] AssetSchemeServer: 404 %s", qPrintable(path));
            writeResponse(socket, 404, "Not Found", "text/plain");
            socket->deleteLater();
            return;
        }

        if (!sendFile(socket, localPath))
            writeResponse(socket, 404, "Not Found", "text/plain");

        socket->deleteLater();
    });

    connect(socket, &QAbstractSocket::disconnected, socket, &QAbstractSocket::deleteLater);
}

bool AssetSchemeServer::sendFile(QAbstractSocket *socket, const QString &localPath)
{
    QFile file(localPath);
    if (!file.open(QIODevice::ReadOnly)) {
        qWarning("[aurobore-container] AssetSchemeServer: open failed %s", qPrintable(localPath));
        return false;
    }

    const QByteArray body = file.readAll();
    const QByteArray contentType = m_resolver->mimeTypeForPath(localPath).toUtf8();
    qInfo("[aurobore-container] AssetSchemeServer: 200 %s (%d bytes)",
          qPrintable(localPath),
          body.size());
    writeResponse(socket, 200, body, contentType);
    return true;
}
