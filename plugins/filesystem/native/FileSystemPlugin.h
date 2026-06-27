#ifndef AUROBORE_FILESYSTEM_PLUGIN_H
#define AUROBORE_FILESYSTEM_PLUGIN_H

#include "IPlugin.h"

#include <QString>

class FileSystemPlugin : public IPlugin
{
    Q_OBJECT

public:
    explicit FileSystemPlugin(BridgeRouter *bridgeRouter, QObject *parent = nullptr);

    QString displayName() const override;

    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;

private:
    QString resolvePath(const QString &relativePath, QString *errorCode) const;
    QString readRelativePath(const QVariant &args) const;
};

#endif
