#ifndef AUROBORE_SCOPE_VALIDATOR_H
#define AUROBORE_SCOPE_VALIDATOR_H

#include <QString>
#include <QStringList>
#include <QVariant>

class ScopeValidator
{
public:
    static bool isValidAppDataRelativePath(const QString &relativePath, QString *message = nullptr);
    static QString resolveAppDataPath(const QString &relativePath, QString *errorCode);

    static bool validate(const QStringList &scopes, const QVariant &args,
                         QString *violatedScope, QString *message);
};

#endif
