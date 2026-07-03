#ifndef AUROBORE_CAMERA_BRIDGE_H
#define AUROBORE_CAMERA_BRIDGE_H

#include <QObject>
#include <QString>

class CameraBridge : public QObject
{
    Q_OBJECT
    Q_PROPERTY(bool active READ isActive NOTIFY activeChanged)

public:
    explicit CameraBridge(QObject *parent = nullptr);

    bool isActive() const { return m_active; }

    Q_INVOKABLE void requestPick(bool allowEditing);
    Q_INVOKABLE void requestCapture(int quality, bool allowEditing);

    Q_INVOKABLE void reportPickResult(const QString &filePath, const QString &mimeType);
    Q_INVOKABLE void reportCaptureResult(const QString &filePath);
    Q_INVOKABLE void reportCancelled();
    Q_INVOKABLE void reportUnavailable();
    Q_INVOKABLE void reportCaptureFailed(const QString &message);

    Q_INVOKABLE void dismissActive();

signals:
    void pickRequested(bool allowEditing);
    void captureRequested(int quality, bool allowEditing);
    void dismissRequested();
    void activeChanged();

    void pickResultReady(const QString &filePath, const QString &mimeType);
    void captureResultReady(const QString &filePath);
    void userCancelled();
    void hardwareUnavailable();
    void captureFailed(const QString &message);

private:
    void setActive(bool active);

    bool m_active = false;
};

#endif
