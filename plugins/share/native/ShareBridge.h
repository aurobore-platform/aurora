#ifndef AUROBORE_SHARE_BRIDGE_H
#define AUROBORE_SHARE_BRIDGE_H

#include <QObject>
#include <QString>
#include <QVariantMap>

class ShareBridge : public QObject
{
    Q_OBJECT
    Q_PROPERTY(bool active READ isActive NOTIFY activeChanged)

public:
    explicit ShareBridge(QObject *parent = nullptr);

    bool isActive() const { return m_active; }

    Q_INVOKABLE void requestShareText(const QString &text, const QString &title);
    Q_INVOKABLE void requestShareUrl(const QString &url, const QString &title);
    Q_INVOKABLE void requestShareFile(const QString &filePath, const QString &mimeType,
                                      const QString &title);

    Q_INVOKABLE void reportCompleted();
    Q_INVOKABLE void reportCancelled();
    Q_INVOKABLE void reportUnavailable();

    Q_INVOKABLE void dismissActive();

signals:
    void shareRequested(const QVariantMap &payload);
    void dismissRequested();
    void activeChanged();

    void shareCompleted();
    void userCancelled();
    void shareUnavailable();

private:
    void beginShare(const QVariantMap &payload);
    void setActive(bool active);

    bool m_active = false;
};

#endif
