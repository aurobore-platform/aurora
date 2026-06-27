#ifndef AUROBORE_NETWORK_PLUGIN_H
#define AUROBORE_NETWORK_PLUGIN_H

#include "IPlugin.h"

#include <QNetworkConfigurationManager>
#include <QTimer>

class NetworkPlugin : public IPlugin
{
    Q_OBJECT

public:
    explicit NetworkPlugin(BridgeRouter *bridgeRouter, QObject *parent = nullptr);

    QString displayName() const override;

    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;

private:
    QVariantMap currentStatus() const;
    void emitStatusChange();

    QNetworkConfigurationManager m_manager;
    QTimer m_pollTimer;
    bool m_lastOnline = true;
};

#endif
