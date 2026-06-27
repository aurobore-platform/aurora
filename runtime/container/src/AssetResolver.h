#ifndef AUROBORE_ASSET_RESOLVER_H
#define AUROBORE_ASSET_RESOLVER_H

#include <QObject>
#include <QString>
#include <QUrl>

class AssetResolver : public QObject
{
    Q_OBJECT
    Q_PROPERTY(QString webRoot READ webRoot WRITE setWebRoot NOTIFY webRootChanged)

public:
    explicit AssetResolver(QObject *parent = nullptr);

    QString webRoot() const { return m_webRoot; }
    void setWebRoot(const QString &webRoot);

    Q_INVOKABLE QString entryUrl() const;
    Q_INVOKABLE QString toFilesystemPath(const QString &urlString) const;
    Q_INVOKABLE QString toFileUrl(const QString &urlString) const;
    Q_INVOKABLE bool isAllowedUrl(const QString &urlString) const;
    Q_INVOKABLE bool isAllowedFileUrl(const QString &urlString) const;
    Q_INVOKABLE QString readTextFile(const QString &urlString) const;
    Q_INVOKABLE QString mimeTypeForPath(const QString &path) const;

signals:
    void webRootChanged();

private:
    QString m_webRoot;
    QString normalizeRelativePath(const QString &path) const;
    QString resolveFilesystemPath(const QUrl &url) const;
};

#endif
