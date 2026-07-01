#ifndef AUROBORE_{{DISPLAY_UPPER}}_PLUGIN_H
#define AUROBORE_{{DISPLAY_UPPER}}_PLUGIN_H

#include "IPlugin.h"

class {{DISPLAY}}Plugin : public IPlugin
{
    Q_OBJECT

public:
    explicit {{DISPLAY}}Plugin(BridgeRouter *bridgeRouter, QObject *parent = nullptr);

    QString displayName() const override;

    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;
};

#endif
