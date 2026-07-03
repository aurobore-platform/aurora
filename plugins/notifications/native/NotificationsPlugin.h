#ifndef AUROBORE_NOTIFICATIONS_PLUGIN_H
#define AUROBORE_NOTIFICATIONS_PLUGIN_H

#include "IPlugin.h"

#include <QtCore/QHash>
#include <QtCore/QPointer>
#include <QtCore/QString>

class Notification;
class NotificationsBridge;
class QTimer;

class NotificationsPlugin : public IPlugin
{
    Q_OBJECT

public:
    static void setNotificationsBridge(NotificationsBridge *bridge);

    explicit NotificationsPlugin(BridgeRouter *bridgeRouter, QObject *parent = nullptr);
    ~NotificationsPlugin() override;

    QString displayName() const override;

    QVariant invoke(const QString &method, const QVariant &args,
                    const QString &id, bool isStream) override;

private:
    struct ActiveNotification {
        QString id;
        Notification *notification = nullptr;
        QTimer *timer = nullptr;
        bool published = false;
    };

    NotificationsBridge *bridge() const;
    bool ensureBridge() const;

    QString resolveNotificationId(const QVariantMap &args) const;
    QVariant notifyOrSchedule(const QVariantMap &args, bool scheduled);
    QVariant cancelById(const QString &notificationId);
    QVariant cancelAll(const QVariantMap &args);
    void setupNotification(ActiveNotification &entry, const QVariantMap &args);
    void publishEntry(ActiveNotification &entry);
    void onNotificationAction(Notification *notification, const QString &action);

    QHash<QString, ActiveNotification> m_active;
};

#endif
