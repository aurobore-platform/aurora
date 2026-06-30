#include "LoopbackTlsCredentials.h"

#include "TlsFingerprint.h"

#include <auroraapp/auroraapp.h>

#include <QtCore/QFile>
#include <QtCore/QUrl>
#include <QtCore/QDebug>
#include <QtNetwork/QSslCertificate>
#include <QtNetwork/QSslKey>

QString LoopbackTlsCredentials::resolveTlsPath(const QString &fileName) const
{
    const QUrl url = Aurora::Application::pathTo(QStringLiteral("tls/") + fileName);
    QString localPath = url.toLocalFile();
    if (localPath.isEmpty()) {
        const QString decoded = url.toString(QUrl::PrettyDecoded);
        localPath = decoded.startsWith(QStringLiteral("file://"))
            ? QUrl(decoded).toLocalFile()
            : decoded;
    }
    if (localPath.isEmpty()) {
        localPath = Aurora::Application::getPath(
                          Aurora::Application::PathType::PackageFilesLocation)
            + QStringLiteral("/tls/") + fileName;
    }
    return localPath;
}

bool LoopbackTlsCredentials::loadFromPackage()
{
    m_valid = false;
    m_cert = QSslCertificate();
    m_key = QSslKey();

    const QString certPath = resolveTlsPath(QStringLiteral("loopback.crt"));
    const QString keyPath = resolveTlsPath(QStringLiteral("loopback.key"));

    QFile certFile(certPath);
    if (!certFile.open(QIODevice::ReadOnly)) {
        qWarning("[aurobore-container] LoopbackTlsCredentials: cert not found %s",
                 qPrintable(certPath));
        return false;
    }
    const QList<QSslCertificate> certs = QSslCertificate::fromDevice(&certFile, QSsl::Pem);
    certFile.close();
    if (certs.isEmpty()) {
        qWarning("[aurobore-container] LoopbackTlsCredentials: cert parse failed %s",
                 qPrintable(certPath));
        return false;
    }

    QFile keyFile(keyPath);
    if (!keyFile.open(QIODevice::ReadOnly)) {
        qWarning("[aurobore-container] LoopbackTlsCredentials: key not found %s",
                 qPrintable(keyPath));
        return false;
    }
    const QSslKey key(keyFile.readAll(), QSsl::Rsa, QSsl::Pem, QSsl::PrivateKey);
    keyFile.close();
    if (key.isNull()) {
        qWarning("[aurobore-container] LoopbackTlsCredentials: key parse failed %s",
                 qPrintable(keyPath));
        return false;
    }

    m_cert = certs.first();
    m_key = key;
    m_valid = true;
    qInfo("[aurobore-container] LoopbackTlsCredentials: loaded from %s", qPrintable(certPath));
    return true;
}

QString LoopbackTlsCredentials::spkiFingerprintBase64() const
{
    return QString::fromLatin1(Aurobore::TlsFingerprint::kSpkiFingerprintBase64);
}

QSslCertificate LoopbackTlsCredentials::certificate() const
{
    return m_cert;
}

QSslKey LoopbackTlsCredentials::privateKey() const
{
    return m_key;
}
