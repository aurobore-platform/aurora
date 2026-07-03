#include "CameraBridge.h"

CameraBridge::CameraBridge(QObject *parent)
    : QObject(parent)
{
}

void CameraBridge::requestPick(bool allowEditing)
{
    if (m_active)
        return;
    setActive(true);
    emit pickRequested(allowEditing);
}

void CameraBridge::requestCapture(int quality, bool allowEditing)
{
    if (m_active)
        return;
    setActive(true);
    emit captureRequested(quality, allowEditing);
}

void CameraBridge::reportPickResult(const QString &filePath, const QString &mimeType)
{
    if (!m_active)
        return;
    setActive(false);
    emit pickResultReady(filePath, mimeType);
}

void CameraBridge::reportCaptureResult(const QString &filePath)
{
    if (!m_active)
        return;
    setActive(false);
    emit captureResultReady(filePath);
}

void CameraBridge::reportCancelled()
{
    if (!m_active)
        return;
    setActive(false);
    emit userCancelled();
}

void CameraBridge::reportUnavailable()
{
    if (!m_active)
        return;
    setActive(false);
    emit hardwareUnavailable();
}

void CameraBridge::reportCaptureFailed(const QString &message)
{
    if (!m_active)
        return;
    setActive(false);
    emit captureFailed(message.isEmpty() ? QStringLiteral("capture failed") : message);
}

void CameraBridge::dismissActive()
{
    if (!m_active)
        return;
    emit dismissRequested();
}

void CameraBridge::setActive(bool active)
{
    if (m_active == active)
        return;
    m_active = active;
    emit activeChanged();
}
