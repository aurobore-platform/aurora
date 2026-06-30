#include "ScopeValidator.h"

#include <QtCore/QDebug>
#include <QtCore/QDir>
#include <QtCore/QStandardPaths>
#include <QtCore/QVariantMap>

bool ScopeValidator::isValidAppDataRelativePath(const QString &relativePath, QString *message)
{
    if (relativePath.isEmpty())
        return true;

    if (relativePath.contains(QStringLiteral(".."))) {
        if (message)
            *message = QStringLiteral("Path traversal is not allowed");
        return false;
    }

    const QString root = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    if (root.isEmpty()) {
        if (message)
            *message = QStringLiteral("App data location unavailable");
        return false;
    }

    QDir dir(root);
    const QString cleaned = QDir::cleanPath(dir.absoluteFilePath(relativePath));
    if (!cleaned.startsWith(QDir::cleanPath(root))) {
        if (message)
            *message = QStringLiteral("Path outside app data scope");
        return false;
    }

    return true;
}

QString ScopeValidator::resolveAppDataPath(const QString &relativePath, QString *errorCode)
{
    QString message;
    if (!isValidAppDataRelativePath(relativePath, &message)) {
        if (errorCode)
            *errorCode = QStringLiteral("FILESYSTEM_PERMISSION_DENIED");
        return QString();
    }

    if (relativePath.isEmpty()) {
        if (errorCode)
            *errorCode = QStringLiteral("FILESYSTEM_INVALID_PATH");
        return QString();
    }

    const QString root = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    QDir dir(root);
    if (!dir.exists() && !dir.mkpath(QStringLiteral("."))) {
        if (errorCode)
            *errorCode = QStringLiteral("FILESYSTEM_UNAVAILABLE");
        return QString();
    }

    return QDir::cleanPath(dir.absoluteFilePath(relativePath));
}

static QString pathFromArgs(const QVariant &args)
{
    if (args.type() == QVariant::Map) {
        return args.toMap().value(QStringLiteral("path")).toString();
    }
    return QString();
}

bool ScopeValidator::validate(const QStringList &scopes, const QVariant &args,
                              QString *violatedScope, QString *message)
{
    for (const QString &scope : scopes) {
        if (scope == QStringLiteral("appData")) {
            const QString path = pathFromArgs(args);
            if (!path.isEmpty() && !isValidAppDataRelativePath(path, message)) {
                if (violatedScope)
                    *violatedScope = scope;
                return false;
            }
        } else {
            qWarning("[aurobore-scope] unknown scope in manifest: %s", qPrintable(scope));
        }
    }
    return true;
}
