#include "NotificationsPlugin.h"

#include "NotificationsBridge.h"
#include "PluginRegistry.h"

#include <notification.h>

#include <QtCore/QDateTime>
#include <QtCore/QTimer>
#include <QtCore/QUuid>
#include <QtCore/QVariantMap>

namespace {

NotificationsBridge *s_notificationsBridge = nullptr;

QString stringArg(const QVariantMap &args, const char *key)
{
    return args.value(QString::fromLatin1(key)).toString();
}

qint64 longLongArg(const QVariantMap &args, const char *key, qint64 defaultValue)
{
    if (!args.contains(QString::fromLatin1(key)))
        return defaultValue;
    return args.value(QString::fromLatin1(key)).toLongLong();
}

} // namespace

void NotificationsPlugin::setNotificationsBridge(NotificationsBridge *bridge)
{
    s_notificationsBridge = bridge;
}

NotificationsPlugin::NotificationsPlugin(BridgeRouter *bridgeRouter, QObject *parent)
    : IPlugin(bridgeRouter, parent)
{
}

NotificationsPlugin::~NotificationsPlugin()
{
    cancelAll(QVariantMap());
}

QString NotificationsPlugin::displayName() const
{
    return QStringLiteral("Notifications");
}

NotificationsBridge *NotificationsPlugin::bridge() const
{
    return s_notificationsBridge;
}

bool NotificationsPlugin::ensureBridge() const
{
    return s_notificationsBridge && s_notificationsBridge->isAvailable();
}

QString NotificationsPlugin::resolveNotificationId(const QVariantMap &args) const
{
    const QString requested = stringArg(args, "id");
    if (!requested.isEmpty())
        return requested;
    return QUuid::createUuid().toString().remove(QLatin1Char('{')).remove(QLatin1Char('}'));
}

QVariant NotificationsPlugin::invoke(const QString &method, const QVariant &args,
                                     const QString &id, bool isStream)
{
    Q_UNUSED(id);
    Q_UNUSED(isStream);

    const QVariantMap argMap = args.toMap();

    if (method == QStringLiteral("notify"))
        return notifyOrSchedule(argMap, false);
    if (method == QStringLiteral("schedule"))
        return notifyOrSchedule(argMap, true);
    if (method == QStringLiteral("cancel"))
        return cancelById(stringArg(argMap, "id"));
    if (method == QStringLiteral("cancelAll"))
        return cancelAll(argMap);

    return makeMethodNotFound(method);
}

QVariant NotificationsPlugin::notifyOrSchedule(const QVariantMap &args, bool scheduled)
{
    if (!ensureBridge()) {
        return makeError(QStringLiteral("NOTIFICATIONS_UNAVAILABLE"),
                         QStringLiteral("notifications not available"));
    }

    const QString title = stringArg(args, "title");
    const QString body = stringArg(args, "body");
    if (title.isEmpty() || body.isEmpty()) {
        return makeError(QStringLiteral("NOTIFICATIONS_UNAVAILABLE"),
                         QStringLiteral("title and body required"));
    }

    const QString notificationId = resolveNotificationId(args);
    if (m_active.contains(notificationId)) {
        cancelById(notificationId);
    }

    ActiveNotification entry;
    entry.id = notificationId;
    entry.notification = new Notification(this);
    setupNotification(entry, args);

    if (!scheduled) {
        publishEntry(entry);
        m_active.insert(notificationId, entry);
        QVariantMap result;
        result.insert(QStringLiteral("id"), notificationId);
        return result;
    }

    const qint64 scheduleAt = longLongArg(args, "scheduleAt", 0);
    if (scheduleAt <= 0) {
        delete entry.notification;
        return makeError(QStringLiteral("NOTIFICATIONS_UNAVAILABLE"),
                         QStringLiteral("scheduleAt required for schedule"));
    }

    const qint64 delayMs = scheduleAt - QDateTime::currentMSecsSinceEpoch();
    if (delayMs <= 0) {
        publishEntry(entry);
        m_active.insert(notificationId, entry);
        QVariantMap result;
        result.insert(QStringLiteral("id"), notificationId);
        return result;
    }

    entry.timer = new QTimer(this);
    entry.timer->setSingleShot(true);
    connect(entry.timer, &QTimer::timeout, this, [this, notificationId]() {
        if (!m_active.contains(notificationId))
            return;
        ActiveNotification &active = m_active[notificationId];
        publishEntry(active);
    });

    m_active.insert(notificationId, entry);
    entry.timer->start(static_cast<int>(qMin<qint64>(delayMs, INT_MAX)));

    QVariantMap result;
    result.insert(QStringLiteral("id"), notificationId);
    return result;
}

void NotificationsPlugin::setupNotification(ActiveNotification &entry, const QVariantMap &args)
{
    NotificationsBridge *notificationsBridge = bridge();
    if (!notificationsBridge || !entry.notification)
        return;

    const QString title = stringArg(args, "title");
    const QString body = stringArg(args, "body");

    entry.notification->setSummary(title);
    entry.notification->setBody(body);
    entry.notification->setUrgency(Notification::Normal);
    entry.notification->setIsTransient(false);
    entry.notification->setRemoteActions(
        QVariantList() << notificationsBridge->remoteAction(entry.id, QStringLiteral("default")));

    connect(entry.notification, &Notification::actionInvoked, this,
            [this, notification = entry.notification](const QString &action) {
                onNotificationAction(notification, action);
            });
    connect(entry.notification, &Notification::clicked, this,
            [this, notification = entry.notification]() {
                onNotificationAction(notification, QStringLiteral("default"));
            });
}

void NotificationsPlugin::publishEntry(ActiveNotification &entry)
{
    if (!entry.notification || entry.published)
        return;

    entry.notification->publish();
    entry.published = true;
    if (entry.timer) {
        entry.timer->stop();
        entry.timer->deleteLater();
        entry.timer = nullptr;
    }
}

void NotificationsPlugin::onNotificationAction(Notification *notification,
                                               const QString &action)
{
    for (auto it = m_active.constBegin(); it != m_active.constEnd(); ++it) {
        if (it.value().notification != notification)
            continue;
        if (NotificationsBridge *notificationsBridge = bridge())
            notificationsBridge->emitTap(it.key(), action);
        return;
    }
}

QVariant NotificationsPlugin::cancelById(const QString &notificationId)
{
    if (notificationId.isEmpty())
        return QVariant();

    if (!m_active.contains(notificationId))
        return QVariant();

    ActiveNotification entry = m_active.take(notificationId);
    if (entry.timer) {
        entry.timer->stop();
        entry.timer->deleteLater();
        entry.timer = nullptr;
    }
    if (entry.notification) {
        if (entry.published)
            entry.notification->close();
        entry.notification->deleteLater();
    }
    return QVariant();
}

QVariant NotificationsPlugin::cancelAll(const QVariantMap &args)
{
    Q_UNUSED(args);

    const QStringList ids = m_active.keys();
    for (const QString &notificationId : ids)
        cancelById(notificationId);
    return QVariant();
}

IPlugin *createNotificationsPlugin(BridgeRouter *router)
{
    return new NotificationsPlugin(router);
}
