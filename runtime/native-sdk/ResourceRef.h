#ifndef AUROBORE_RESOURCE_REF_H
#define AUROBORE_RESOURCE_REF_H

#include <QByteArray>
#include <QString>
#include <QVariantMap>

namespace AuroboreResource {

QString appDataUrlPrefix();

QVariantMap makeResourceRef(const QString &relativePath,
                            const QString &mimeType = QString(),
                            qint64 size = -1);

QVariantMap writeAppDataFile(const QString &appDataRoot,
                             const QString &relativePath,
                             const QByteArray &data,
                             const QString &mimeType = QString());

} // namespace AuroboreResource

#endif
