#include "FileSystemPlugin.h"

#include "PluginRegistry.h"
#include "ScopeValidator.h"

#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QFileInfo>
#include <QtCore/QStandardPaths>
#include <QtCore/QVariantMap>

FileSystemPlugin::FileSystemPlugin(BridgeRouter *bridgeRouter, QObject *parent)
    : IPlugin(bridgeRouter, parent)
{
}

QString FileSystemPlugin::displayName() const
{
    return QStringLiteral("FileSystem");
}

QString FileSystemPlugin::readRelativePath(const QVariant &args) const
{
    if (args.type() == QVariant::Map) {
        return args.toMap().value(QStringLiteral("path")).toString();
    }
    return QString();
}

QString FileSystemPlugin::resolvePath(const QString &relativePath, QString *errorCode) const
{
    return ScopeValidator::resolveAppDataPath(relativePath, errorCode);
}

QVariant FileSystemPlugin::invoke(const QString &method, const QVariant &args,
                                  const QString &id, bool isStream)
{
    Q_UNUSED(id);
    Q_UNUSED(isStream);

    QString errorCode;
    const QString rel = readRelativePath(args);
    const QString abs = resolvePath(rel, &errorCode);
    if (abs.isEmpty() && method != QStringLiteral("exists")) {
        return makeError(errorCode, QStringLiteral("Invalid or blocked path"));
    }

    if (method == QStringLiteral("readText")) {
        QFile file(abs);
        if (!file.exists()) {
            return makeError(QStringLiteral("FILESYSTEM_NOT_FOUND"),
                             QStringLiteral("File not found"));
        }
        if (!file.open(QIODevice::ReadOnly | QIODevice::Text)) {
            return makeError(QStringLiteral("FILESYSTEM_IO_ERROR"),
                             QStringLiteral("Cannot read file"));
        }
        QVariantMap result;
        result.insert(QStringLiteral("text"), QString::fromUtf8(file.readAll()));
        return result;
    }

    if (method == QStringLiteral("writeText")) {
        const QVariantMap map = args.toMap();
        QFileInfo info(abs);
        QDir().mkpath(info.absolutePath());
        QFile file(abs);
        if (!file.open(QIODevice::WriteOnly | QIODevice::Truncate | QIODevice::Text)) {
            return makeError(QStringLiteral("FILESYSTEM_IO_ERROR"),
                             QStringLiteral("Cannot write file"));
        }
        file.write(map.value(QStringLiteral("text")).toString().toUtf8());
        return QVariant(true);
    }

    if (method == QStringLiteral("exists")) {
        const QString checkPath = abs.isEmpty() ? resolvePath(rel, &errorCode) : abs;
        QVariantMap result;
        result.insert(QStringLiteral("exists"), QFileInfo::exists(checkPath));
        return result;
    }

    if (method == QStringLiteral("mkdir")) {
        QDir dir;
        if (!dir.mkpath(abs)) {
            return makeError(QStringLiteral("FILESYSTEM_IO_ERROR"),
                             QStringLiteral("Cannot create directory"));
        }
        return QVariant(true);
    }

    if (method == QStringLiteral("delete")) {
        QFileInfo info(abs);
        bool ok = false;
        if (info.isDir()) {
            ok = QDir(abs).removeRecursively();
        } else {
            ok = QFile::remove(abs);
        }
        if (!ok) {
            return makeError(QStringLiteral("FILESYSTEM_IO_ERROR"),
                             QStringLiteral("Cannot delete path"));
        }
        return QVariant(true);
    }

    if (method == QStringLiteral("list")) {
        QDir dir(abs);
        if (!dir.exists()) {
            return makeError(QStringLiteral("FILESYSTEM_NOT_FOUND"),
                             QStringLiteral("Directory not found"));
        }
        QVariantMap result;
        result.insert(QStringLiteral("entries"), QVariant::fromValue(dir.entryList()));
        return result;
    }

    return makeMethodNotFound(method);
}

IPlugin *createFileSystemPlugin(BridgeRouter *router)
{
    return new FileSystemPlugin(router);
}
