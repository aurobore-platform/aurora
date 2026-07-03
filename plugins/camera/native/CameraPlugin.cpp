#include "CameraPlugin.h"

#include "BridgeRouter.h"
#include "CameraBridge.h"
#include "PluginRegistry.h"
#include "ResourceRef.h"

#include <QtCore/QBuffer>
#include <QtCore/QFile>
#include <QtCore/QStandardPaths>
#include <QtCore/QUuid>
#include <QtCore/QVariantMap>
#include <QtGui/QImage>

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
{
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

QString CameraPlugin::displayName() const
{
    return QStringLiteral("Camera");
}

QVariant CameraPlugin::invoke(const QString &method, const QVariant &args,
                              const QString &id, bool isStream)
{
    Q_UNUSED(isStream);

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

IPlugin *createCameraPlugin(BridgeRouter *router)
{
    return new CameraPlugin(router);
}
