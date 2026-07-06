#include "CameraPlugin.h"

#include "BridgeRouter.h"
#include "CameraBridge.h"
#include "PluginRegistry.h"
#include "ResourceRef.h"
#include "StreamPublisher.h"

#include <QtCore/QBuffer>
#include <QtCore/QDateTime>
#include <QtCore/QFile>
#include <QtCore/QStandardPaths>
#include <QtCore/QUuid>
#include <QtCore/QVariantMap>
#include <QtCore/QTimer>
#include <QtGui/QImage>
#include <QtMultimedia/QCamera>
#include <QtMultimedia/QCameraImageCapture>
#include <QtMultimedia/QCameraInfo>

namespace {

CameraBridge *s_cameraBridge = nullptr;

int clampQuality(int quality)
{
    if (quality < 0)
        return 80;
    if (quality > 100)
        return 100;
    return quality;
}

int clampFps(int fps)
{
    if (fps < 1)
        return 15;
    if (fps > 30)
        return 30;
    return fps;
}

QString photoExtensionForMime(const QString &mime)
{
    if (mime == QStringLiteral("image/png"))
        return QStringLiteral("png");
    if (mime == QStringLiteral("image/webp"))
        return QStringLiteral("webp");
    return QStringLiteral("jpg");
}

QString formatFromMime(const QString &mime)
{
    if (mime == QStringLiteral("image/png"))
        return QStringLiteral("png");
    if (mime == QStringLiteral("image/webp"))
        return QStringLiteral("webp");
    if (mime == QStringLiteral("image/jpeg") || mime == QStringLiteral("image/jpg"))
        return QStringLiteral("jpeg");
    return QString();
}

} // namespace

void CameraPlugin::setCameraBridge(CameraBridge *bridge)
{
    s_cameraBridge = bridge;
}

CameraPlugin::CameraPlugin(BridgeRouter *bridgeRouter, QObject *parent)
    : IPlugin(bridgeRouter, parent)
    , m_previewPublisher(new StreamPublisher(bridgeRouter, this))
    , m_previewTimer(new QTimer(this))
{
    m_previewTimer->setSingleShot(false);
    connect(m_previewTimer, &QTimer::timeout, this, &CameraPlugin::emitSyntheticFrame);

    if (!s_cameraBridge)
        return;

    connect(s_cameraBridge, &CameraBridge::pickResultReady, this,
            [this](const QString &filePath, const QString &mimeType) {
                if (m_pendingMethod != QStringLiteral("pickPhoto"))
                    return;
                finishWithPhoto(filePath, mimeType);
            });
    connect(s_cameraBridge, &CameraBridge::captureResultReady, this,
            [this](const QString &filePath) {
                if (m_pendingMethod != QStringLiteral("getPhoto"))
                    return;
                finishWithPhoto(filePath, QStringLiteral("image/jpeg"));
            });
    connect(s_cameraBridge, &CameraBridge::userCancelled, this, [this]() {
        finishWithError(QStringLiteral("CAMERA_CANCELLED"),
                        QStringLiteral("user cancelled"));
    });
    connect(s_cameraBridge, &CameraBridge::hardwareUnavailable, this, [this]() {
        finishWithError(QStringLiteral("CAMERA_UNAVAILABLE"),
                        QStringLiteral("camera or gallery not available"));
    });
    connect(s_cameraBridge, &CameraBridge::captureFailed, this,
            [this](const QString &message) {
                finishWithError(QStringLiteral("CAMERA_CAPTURE_FAILED"), message);
            });
}

CameraPlugin::~CameraPlugin()
{
    stopPreview();
}

QString CameraPlugin::displayName() const
{
    return QStringLiteral("Camera");
}

QVariant CameraPlugin::invoke(const QString &method, const QVariant &args,
                              const QString &id, bool isStream)
{
    if (method == QStringLiteral("watchPreview")) {
        Q_UNUSED(isStream);
        startPreview(id, args.toMap());
        return QVariant();
    }

    if (method != QStringLiteral("getPhoto") && method != QStringLiteral("pickPhoto"))
        return makeMethodNotFound(method);

    if (!s_cameraBridge) {
        return makeError(QStringLiteral("CAMERA_UNAVAILABLE"),
                         QStringLiteral("camera or gallery not available"));
    }

    if (!m_pendingId.isEmpty()) {
        return makeError(QStringLiteral("CAMERA_CAPTURE_FAILED"),
                         QStringLiteral("camera operation already in progress"));
    }

    const QVariantMap argMap = args.toMap();
    const int quality = clampQuality(argMap.value(QStringLiteral("quality"), 80).toInt());
    Q_UNUSED(argMap.value(QStringLiteral("allowEditing")).toBool());

    m_pendingId = id;
    m_pendingMethod = method;
    m_pendingQuality = quality;

    if (method == QStringLiteral("pickPhoto")) {
        const bool allowEditing = argMap.value(QStringLiteral("allowEditing")).toBool();
        s_cameraBridge->requestPick(allowEditing);
        return QVariant();
    }

    const bool allowEditing = argMap.value(QStringLiteral("allowEditing")).toBool();
    s_cameraBridge->requestCapture(quality, allowEditing);
    return QVariant();
}

void CameraPlugin::cancel(const QString &id)
{
    if (m_previewId == id) {
        stopPreview();
        return;
    }

    if (m_pendingId != id || !s_cameraBridge)
        return;

    s_cameraBridge->dismissActive();
    finishWithError(QStringLiteral("CAMERA_CANCELLED"),
                    QStringLiteral("user cancelled"));
}

void CameraPlugin::clearPending()
{
    m_pendingId.clear();
    m_pendingMethod.clear();
    m_pendingQuality = 80;
}

void CameraPlugin::finishWithPhoto(const QString &sourcePath, const QString &mimeHint)
{
    if (m_pendingId.isEmpty())
        return;

    const QString invokeId = m_pendingId;
    const int quality = m_pendingQuality;
    clearPending();

    const QVariantMap photo = buildPhotoFromFile(sourcePath, mimeHint, quality);
    if (photo.isEmpty()) {
        router()->emitOutbound(router()->makeErrorResponse(
            invokeId,
            QStringLiteral("CAMERA_CAPTURE_FAILED"),
            QStringLiteral("capture failed")));
        return;
    }

    router()->emitOutbound(router()->makeOkResponse(invokeId, photo));
}

void CameraPlugin::finishWithError(const QString &code, const QString &message)
{
    if (m_pendingId.isEmpty())
        return;

    const QString invokeId = m_pendingId;
    clearPending();
    router()->emitOutbound(router()->makeErrorResponse(invokeId, code, message));
}

QVariantMap CameraPlugin::buildPhotoFromFile(const QString &sourcePath,
                                            const QString &mimeHint,
                                            int quality) const
{
    QFile file(sourcePath);
    if (!file.open(QIODevice::ReadOnly))
        return QVariantMap();

    QByteArray data = file.readAll();
    if (data.isEmpty())
        return QVariantMap();

    QString mime = mimeHint;
    if (mime.isEmpty())
        mime = QStringLiteral("image/jpeg");

    QString format = formatFromMime(mime);
    int width = -1;
    int height = -1;

    QImage image;
    if (image.loadFromData(data)) {
        width = image.width();
        height = image.height();

        const bool reencodeAsJpeg = quality >= 0 && quality <= 100
            && (mime == QStringLiteral("image/jpeg")
                || mime == QStringLiteral("image/jpg")
                || mime == QStringLiteral("image/png")
                || mime == QStringLiteral("image/webp"));

        if (reencodeAsJpeg) {
            QByteArray encoded;
            QBuffer buffer(&encoded);
            if (buffer.open(QIODevice::WriteOnly) && image.save(&buffer, "JPEG", quality)) {
                data = encoded;
                mime = QStringLiteral("image/jpeg");
                format = QStringLiteral("jpeg");
            }
        } else if (format.isEmpty()) {
            format = photoExtensionForMime(mime);
        }
    }

    const QString relativePath =
        QStringLiteral("camera/")
        + QUuid::createUuid().toString().remove(QLatin1Char('{')).remove(QLatin1Char('}'))
        + QLatin1Char('.')
        + photoExtensionForMime(mime);

    const QString appDataRoot =
        QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    const QVariantMap ref =
        AuroboreResource::writeAppDataFile(appDataRoot, relativePath, data, mime);
    if (ref.isEmpty())
        return QVariantMap();

    QVariantMap photo = ref;
    if (width > 0)
        photo.insert(QStringLiteral("width"), width);
    if (height > 0)
        photo.insert(QStringLiteral("height"), height);
    if (!format.isEmpty())
        photo.insert(QStringLiteral("format"), format);
    return photo;
}

QVariantMap CameraPlugin::framePayloadFromJpeg(const QByteArray &jpeg, int width,
                                               int height) const
{
    QVariantMap payload;
    payload.insert(QStringLiteral("kind"), QStringLiteral("frame"));
    payload.insert(QStringLiteral("format"), QStringLiteral("jpeg"));
    payload.insert(QStringLiteral("width"), width);
    payload.insert(QStringLiteral("height"), height);
    payload.insert(QStringLiteral("timestamp"),
                   static_cast<qint64>(QDateTime::currentMSecsSinceEpoch()));
    payload.insert(QStringLiteral("binaryPayload"),
                   QString::fromLatin1(jpeg.toBase64()));
    return payload;
}

void CameraPlugin::startPreview(const QString &subscriptionId, const QVariantMap &args)
{
    if (!m_previewId.isEmpty()) {
        router()->emitStream(subscriptionId, QStringLiteral("error"), QVariant(),
                             makeError(QStringLiteral("CAMERA_CAPTURE_FAILED"),
                                       QStringLiteral("camera preview already active")));
        return;
    }

    m_previewWidth = args.value(QStringLiteral("width"), 640).toInt();
    m_previewHeight = args.value(QStringLiteral("height"), 480).toInt();
    if (m_previewWidth < 64)
        m_previewWidth = 64;
    if (m_previewHeight < 64)
        m_previewHeight = 64;

    const int maxFps = clampFps(args.value(QStringLiteral("maxFps"), 15).toInt());
    m_previewId = subscriptionId;
    m_previewPublisher->setMaxHz(maxFps);
    m_previewPublisher->start(subscriptionId);

    const QList<QCameraInfo> cameras = QCameraInfo::availableCameras();
    if (!cameras.isEmpty()) {
        const QString facing = args.value(QStringLiteral("facingMode")).toString();
        QCameraInfo selected = cameras.first();
        for (const QCameraInfo &info : cameras) {
            if (facing == QStringLiteral("user") && info.position() == QCamera::FrontFace) {
                selected = info;
                break;
            }
            if (facing == QStringLiteral("environment") && info.position() == QCamera::BackFace) {
                selected = info;
                break;
            }
        }

        m_previewCamera = new QCamera(selected, this);
        m_previewCapture = new QCameraImageCapture(m_previewCamera, this);
        connect(m_previewCapture,
                static_cast<void (QCameraImageCapture::*)(int, const QImage &)>(
                    &QCameraImageCapture::imageCaptured),
                this, &CameraPlugin::onImageCaptured);
        m_previewCamera->start();
        const int intervalMs = qMax(1, 1000 / maxFps);
        m_previewTimer->start(intervalMs);
        if (m_previewCapture->isCaptureDestinationSupported())
            m_previewCapture->setCaptureDestination(QCameraImageCapture::CaptureToBuffer);
        return;
    }

    const int intervalMs = qMax(1, 1000 / maxFps);
    m_previewTimer->start(intervalMs);
    emitSyntheticFrame();
}

void CameraPlugin::stopPreview()
{
    m_previewTimer->stop();
    if (m_previewPublisher->isActive())
        m_previewPublisher->cancel();
    if (m_previewCamera) {
        m_previewCamera->stop();
        m_previewCamera->deleteLater();
        m_previewCamera = nullptr;
    }
    if (m_previewCapture) {
        m_previewCapture->deleteLater();
        m_previewCapture = nullptr;
    }
    m_previewId.clear();
}

void CameraPlugin::emitSyntheticFrame()
{
    if (m_previewId.isEmpty() || !m_previewPublisher->isActive())
        return;

    if (m_previewCapture && m_previewCamera && m_previewCamera->state() == QCamera::ActiveState) {
        if (!m_previewCapture->isReadyForCapture())
            return;
        m_previewCapture->capture();
        return;
    }

    QImage image(m_previewWidth, m_previewHeight, QImage::Format_RGB32);
    const qint64 t = QDateTime::currentMSecsSinceEpoch();
    image.fill(QColor::fromRgb(static_cast<int>(t % 255), 80, 120));

    QByteArray jpeg;
    QBuffer buffer(&jpeg);
    if (!buffer.open(QIODevice::WriteOnly) || !image.save(&buffer, "JPEG", 70))
        return;

    m_previewPublisher->push(framePayloadFromJpeg(jpeg, m_previewWidth, m_previewHeight));
}

void CameraPlugin::onImageCaptured(int id, const QImage &preview)
{
    Q_UNUSED(id);
    if (m_previewId.isEmpty() || !m_previewPublisher->isActive() || preview.isNull())
        return;

    QImage scaled = preview.scaled(m_previewWidth, m_previewHeight, Qt::KeepAspectRatio,
                                   Qt::SmoothTransformation);
    QByteArray jpeg;
    QBuffer buffer(&jpeg);
    if (!buffer.open(QIODevice::WriteOnly) || !scaled.save(&buffer, "JPEG", 70))
        return;

    m_previewPublisher->push(
        framePayloadFromJpeg(jpeg, scaled.width(), scaled.height()));
}

IPlugin *createCameraPlugin(BridgeRouter *router)
{
    return new CameraPlugin(router);
}
