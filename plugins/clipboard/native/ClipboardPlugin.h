#ifndef AUROBORE_CLIPBOARD_PLUGIN_H
#define AUROBORE_CLIPBOARD_PLUGIN_H

#include "IPlugin.h"

class ClipboardPlugin : public IPlugin
{
    Q_OBJECT

public:
    explicit ClipboardPlugin(BridgeRouter *bridgeRouter, QObject *parent = nullptr);

    QString displayName() const override;

    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;
};

#endif
