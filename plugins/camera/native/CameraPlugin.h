#ifndef AUROBORE_CAMERA_PLUGIN_H
#define AUROBORE_CAMERA_PLUGIN_H

#include "IPlugin.h"

class CameraBridge;
class QCamera;
class QCameraImageCapture;
class QTimer;
class StreamPublisher;

class CameraPlugin : public IPlugin
{
    Q_OBJECT

public:
    static void setCameraBridge(CameraBridge *bridge);

    explicit CameraPlugin(BridgeRouter *bridgeRouter, QObject *parent = nullptr);
    ~CameraPlugin() override;

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

    void startPreview(const QString &subscriptionId, const QVariantMap &args);
    void stopPreview();
    void emitSyntheticFrame();
    void onImageCaptured(int id, const QImage &preview);
    QVariantMap framePayloadFromJpeg(const QByteArray &jpeg, int width, int height) const;

    QString m_pendingId;
    QString m_pendingMethod;
    int m_pendingQuality = 80;

    StreamPublisher *m_previewPublisher = nullptr;
    QTimer *m_previewTimer = nullptr;
    QCamera *m_previewCamera = nullptr;
    QCameraImageCapture *m_previewCapture = nullptr;
    QString m_previewId;
    int m_previewWidth = 640;
    int m_previewHeight = 480;
};

#endif
