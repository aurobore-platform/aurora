#ifndef AUROBORE_SHARE_PLUGIN_H
#define AUROBORE_SHARE_PLUGIN_H

#include "IPlugin.h"

class ShareBridge;

class SharePlugin : public IPlugin
{
    Q_OBJECT

public:
    static void setShareBridge(ShareBridge *bridge);

    explicit SharePlugin(BridgeRouter *bridgeRouter, QObject *parent = nullptr);

    QString displayName() const override;

    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;

    void cancel(const QString &id) override;

private:
    void clearPending();
    void finishWithSuccess();
    void finishWithError(const QString &code, const QString &message);
    QString resolveAppDataFilePath(const QString &resourceUrl) const;

    QString m_pendingId;
    QString m_pendingMethod;
};

#endif
