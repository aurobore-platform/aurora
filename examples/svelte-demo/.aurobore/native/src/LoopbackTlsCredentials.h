#ifndef AUROBORE_LOOPBACK_TLS_CREDENTIALS_H
#define AUROBORE_LOOPBACK_TLS_CREDENTIALS_H

#include <QString>
#include <QSslCertificate>
#include <QSslKey>

/**
 * Embedded loopback TLS cert/key from package share/tls/ (generated at build time).
 */
class LoopbackTlsCredentials
{
public:
    bool loadFromPackage();

    bool isValid() const { return m_valid; }
    QString spkiFingerprintBase64() const;
    QSslCertificate certificate() const;
    QSslKey privateKey() const;

private:
    QString resolveTlsPath(const QString &fileName) const;

    bool m_valid = false;
    QSslCertificate m_cert;
    QSslKey m_key;
};

#endif
