#ifndef AUROBORE_STORAGE_PLUGIN_H
#define AUROBORE_STORAGE_PLUGIN_H

#include "IPlugin.h"

#include <QHash>
#include <QString>

class StoragePlugin : public IPlugin
{
    Q_OBJECT

public:
    explicit StoragePlugin(BridgeRouter *bridgeRouter, QObject *parent = nullptr);

    QString displayName() const override;

    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;

private:
    QString readKey(const QVariant &args) const;

    QHash<QString, QString> m_store;
};

#endif
