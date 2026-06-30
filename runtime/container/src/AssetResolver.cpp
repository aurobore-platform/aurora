#include "AssetResolver.h"

#include "AppConfig.h"

#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QMimeDatabase>

AssetResolver::AssetResolver(QObject *parent)
    : QObject(parent)
{
}

void AssetResolver::setWebRoot(const QString &webRoot)
{
    const QString normalized = QDir::cleanPath(webRoot);
    if (m_webRoot == normalized)
        return;
    m_webRoot = normalized;
    emit webRootChanged();
}

void AssetResolver::setAppDataRoot(const QString &appDataRoot)
{
    const QString normalized = QDir::cleanPath(appDataRoot);
    if (m_appDataRoot == normalized)
        return;
    m_appDataRoot = normalized;
    emit appDataRootChanged();
}

QString AssetResolver::entryUrl() const
{
    return QString::fromLatin1(Aurobore::AppConfig::kEntryUrl);
}

QString AssetResolver::normalizeRelativePath(const QString &path) const
{
    QString cleaned = path;
    if (cleaned.startsWith(QLatin1Char('/')))
        cleaned = cleaned.mid(1);
    cleaned = QDir::cleanPath(cleaned);
    if (cleaned == QLatin1String(".") || cleaned.isEmpty())
        return QString();
    if (cleaned.contains(QLatin1String("..")))
        return QString();
    return cleaned;
}

QString AssetResolver::resolveFilesystemPath(const QUrl &url) const
{
    if (m_webRoot.isEmpty())
        return QString();

    if (url.scheme() != QLatin1String(Aurobore::AppConfig::kAppScheme))
        return QString();

    const QString host = url.host();
    if (!host.isEmpty() && host != QLatin1String(Aurobore::AppConfig::kAppHost))
        return QString();

    QString pathPart = url.path();
    if (pathPart.isEmpty() || pathPart == QLatin1String("/"))
        pathPart = QStringLiteral("/index.html");

    const QString relative = normalizeRelativePath(pathPart);
    if (relative.isEmpty())
        return QString();

    if (relative.startsWith(QLatin1String("app-data/"))) {
        if (m_appDataRoot.isEmpty())
            return QString();
        const QString subPath = relative.mid(QStringLiteral("app-data/").length());
        if (subPath.isEmpty())
            return QString();
        const QString candidate = QDir(m_appDataRoot).filePath(subPath);
        const QFileInfo info(candidate);
        if (!info.exists() || !info.isFile())
            return QString();
        const QString root = QDir(m_appDataRoot).canonicalPath();
        if (root.isEmpty())
            return info.absoluteFilePath();
        const QString canonical = info.canonicalFilePath();
        if (canonical.isEmpty())
            return info.absoluteFilePath();
        if (!canonical.startsWith(root))
            return QString();
        return canonical;
    }

    const QString candidate = QDir(m_webRoot).filePath(relative);
    const QFileInfo info(candidate);
    if (!info.exists() || !info.isFile())
        return QString();

    const QString root = QDir(m_webRoot).canonicalPath();
    if (root.isEmpty())
        return info.absoluteFilePath();

    const QString canonical = info.canonicalFilePath();
    if (canonical.isEmpty())
        return info.absoluteFilePath();
    if (!canonical.startsWith(root))
        return QString();

    return canonical;
}

QString AssetResolver::toFilesystemPath(const QString &urlString) const
{
    QString result = resolveFilesystemPath(QUrl(urlString));
    if (!result.isEmpty())
        return result;

    const QString prefix = QString::fromLatin1("aurobore-app://localhost");
    if (!urlString.startsWith(prefix))
        return QString();

    QString rel = urlString.mid(prefix.length());
    if (rel.isEmpty() || rel == QLatin1String("/"))
        rel = QStringLiteral("/index.html");

    QUrl synthetic;
    synthetic.setScheme(QString::fromLatin1(Aurobore::AppConfig::kAppScheme));
    synthetic.setHost(QString::fromLatin1(Aurobore::AppConfig::kAppHost));
    synthetic.setPath(rel.startsWith(QLatin1Char('/')) ? rel : QLatin1Char('/') + rel);
    return resolveFilesystemPath(synthetic);
}

QString AssetResolver::toFileUrl(const QString &urlString) const
{
    const QString path = toFilesystemPath(urlString);
    if (path.isEmpty())
        return QString();
    return QUrl::fromLocalFile(path).toString();
}

bool AssetResolver::isAllowedUrl(const QString &urlString) const
{
    return !toFilesystemPath(urlString).isEmpty();
}

bool AssetResolver::isAllowedFileUrl(const QString &urlString) const
{
    if (m_webRoot.isEmpty())
        return false;

    const QUrl url(urlString);
    if (!url.isLocalFile())
        return false;

    const QString local = QDir::cleanPath(url.toLocalFile());
    const QString root = QDir::cleanPath(m_webRoot);
    if (local == root)
        return true;
    if (!local.startsWith(root + QLatin1Char('/')))
        return false;

    const QFileInfo info(local);
    return info.exists();
}

QString AssetResolver::readTextFile(const QString &urlString) const
{
    const QString path = toFilesystemPath(urlString);
    if (path.isEmpty())
        return QString();

    QFile file(path);
    if (!file.open(QIODevice::ReadOnly | QIODevice::Text))
        return QString();
    return QString::fromUtf8(file.readAll());
}

QString AssetResolver::mimeTypeForPath(const QString &path) const
{
    QMimeDatabase db;
    QString mime = db.mimeTypeForFile(path).name();
    if (mime == QLatin1String("application/octet-stream")) {
        if (path.endsWith(QLatin1String(".js"), Qt::CaseInsensitive))
            return QStringLiteral("application/javascript");
        if (path.endsWith(QLatin1String(".css"), Qt::CaseInsensitive))
            return QStringLiteral("text/css");
        if (path.endsWith(QLatin1String(".svg"), Qt::CaseInsensitive))
            return QStringLiteral("image/svg+xml");
    }
    return mime;
}
