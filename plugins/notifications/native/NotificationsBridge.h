#ifndef AUROBORE_NOTIFICATIONS_BRIDGE_H
#define AUROBORE_NOTIFICATIONS_BRIDGE_H

#include <QtCore/QObject>
#include <QtCore/QString>
#include <QtCore/QVariantList>

class BridgeRouter;

class NotificationsBridge : public QObject
{
    Q_OBJECT

public:
    explicit NotificationsBridge(QObject *parent = nullptr);

    bool initialize(const QString &appId, BridgeRouter *router);
    bool isAvailable() const;

    QString dbusService() const;
    QString dbusPath() const;
    QString dbusInterface() const;

    QVariant remoteAction(const QString &notificationId, const QString &actionName) const;

    void emitTap(const QString &notificationId, const QString &action);

    void setWebReady(bool ready);
    void deliverPending();

public slots:
    void onNotificationActivated(const QString &notificationId, const QString &action);

private:
    void tryFlushPending();

    BridgeRouter *m_router = nullptr;
    QString m_service;
    QString m_path;
    QString m_interface;
    bool m_dbusRegistered = false;
    bool m_webReady = false;
    QVariantList m_pendingTaps;
};

#endif
