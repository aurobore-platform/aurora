#include "ResourceRef.h"

#include <QDir>
#include <QFile>
#include <QFileInfo>

namespace AuroboreResource {

QString appDataUrlPrefix()
{
    return QStringLiteral("aurobore-app://localhost/app-data/");
}

static QString normalizeRelativePath(const QString &path)
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

QVariantMap makeResourceRef(const QString &relativePath,
                            const QString &mimeType,
                            qint64 size)
{
    const QString normalized = normalizeRelativePath(relativePath);
    QVariantMap ref;
    ref.insert(QStringLiteral("kind"), QStringLiteral("resource"));
    ref.insert(QStringLiteral("url"), appDataUrlPrefix() + normalized);
    if (!mimeType.isEmpty())
        ref.insert(QStringLiteral("mimeType"), mimeType);
    if (size >= 0)
        ref.insert(QStringLiteral("size"), size);
    return ref;
}

QVariantMap writeAppDataFile(const QString &appDataRoot,
                             const QString &relativePath,
                             const QByteArray &data,
                             const QString &mimeType)
{
    const QString normalized = normalizeRelativePath(relativePath);
    if (normalized.isEmpty() || appDataRoot.isEmpty())
        return QVariantMap();

    const QString absolutePath = QDir(appDataRoot).filePath(normalized);
    const QFileInfo info(absolutePath);
    QDir().mkpath(info.absolutePath());

    QFile file(absolutePath);
    if (!file.open(QIODevice::WriteOnly))
        return QVariantMap();

    if (file.write(data) != data.size())
        return QVariantMap();

    return makeResourceRef(normalized, mimeType, data.size());
}

} // namespace AuroboreResource
