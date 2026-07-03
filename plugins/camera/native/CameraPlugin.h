#ifndef AUROBORE_CAMERA_PLUGIN_H
#define AUROBORE_CAMERA_PLUGIN_H

#include "IPlugin.h"

class CameraBridge;

class CameraPlugin : public IPlugin
{
    Q_OBJECT

public:
    static void setCameraBridge(CameraBridge *bridge);

    explicit CameraPlugin(BridgeRouter *bridgeRouter, QObject *parent = nullptr);

    QString displayName() const override;

    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;

    void cancel(const QString &id) override;

private:
    void clearPending();
    void finishWithPhoto(const QString &sourcePath, const QString &mimeHint);
    void finishWithError(const QString &code, const QString &message);
    QVariantMap buildPhotoFromFile(const QString &sourcePath,
                                   const QString &mimeHint,
                                   int quality) const;

    QString m_pendingId;
    QString m_pendingMethod;
    int m_pendingQuality = 80;
};

#endif
