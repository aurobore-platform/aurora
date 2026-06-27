#include "AssetSchemeServer.h"

#include "AppConfig.h"
#include "AssetResolver.h"

#include <QByteArray>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QHostAddress>
#include <QTcpSocket>
#include <QUrl>

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

void writeResponse(QTcpSocket *socket, int code, const QByteArray &body, const QByteArray &contentType)
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
    socket->flush();
    socket->disconnectFromHost();
}

} // namespace

AssetSchemeServer::AssetSchemeServer(QObject *parent)
    : QObject(parent)
{
    connect(&m_server, &QTcpServer::newConnection, this, &AssetSchemeServer::onNewConnection);
}

bool AssetSchemeServer::start(AssetResolver *resolver)
{
    if (!resolver || resolver->webRoot().isEmpty())
        return false;

    m_resolver = resolver;

    if (m_server.isListening())
        m_server.close();

    if (!m_server.listen(QHostAddress::LocalHost, 0)) {
        qWarning("[aurobore-container] AssetSchemeServer: listen failed");
        return false;
    }

    const quint16 port = m_server.serverPort();
    m_baseUrl = QStringLiteral("http://127.0.0.1:%1").arg(port);
    m_origin = m_baseUrl;
    emit baseUrlChanged();

    qInfo("[aurobore-container] AssetSchemeServer: %s (webRoot=%s)",
          qPrintable(m_baseUrl),
          qPrintable(resolver->webRoot()));
    return true;
}

void AssetSchemeServer::stop()
{
    if (m_server.isListening())
        m_server.close();
}

bool AssetSchemeServer::isAllowedUrl(const QString &urlString) const
{
    if (m_origin.isEmpty())
        return false;
    return urlString.startsWith(m_origin);
}

void AssetSchemeServer::onNewConnection()
{
    while (m_server.hasPendingConnections()) {
        QTcpSocket *socket = m_server.nextPendingConnection();
        if (socket)
            handleClient(socket);
    }
}

void AssetSchemeServer::handleClient(QTcpSocket *socket)
{
    if (!socket || !m_resolver) {
        if (socket)
            socket->deleteLater();
        return;
    }

    connect(socket, &QTcpSocket::readyRead, socket, [this, socket]() {
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

    connect(socket, &QTcpSocket::disconnected, socket, &QTcpSocket::deleteLater);
}

bool AssetSchemeServer::sendFile(QTcpSocket *socket, const QString &localPath)
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
