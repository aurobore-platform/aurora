#include "NotificationsBridge.h"

#include "BridgeRouter.h"

#include <notification.h>

#include <QtCore/QDebug>
#include <QtDBus/QDBusConnection>
#include <QtDBus/QDBusConnectionInterface>
#include <QtCore/QVariantMap>

namespace {

QString dbusPathFromAppId(const QString &appId)
{
    QString path = appId;
    return QStringLiteral("/") + path.replace(QLatin1Char('.'), QLatin1Char('/'));
}

} // namespace

NotificationsBridge::NotificationsBridge(QObject *parent)
    : QObject(parent)
{
}

bool NotificationsBridge::initialize(const QString &appId, BridgeRouter *router)
{
    m_router = router;
    if (appId.isEmpty()) {
        qWarning("[aurobore-notifications] app id required for D-Bus registration");
        return false;
    }

    m_service = appId;
    m_path = dbusPathFromAppId(appId);
    m_interface = appId;

    QDBusConnection connection = QDBusConnection::sessionBus();
    if (!connection.isConnected()) {
        qWarning("[aurobore-notifications] session D-Bus unavailable");
        return false;
    }

    if (!connection.interface()->isServiceRegistered(m_service)) {
        if (!connection.registerService(m_service)) {
            qWarning("[aurobore-notifications] unable to register D-Bus service '%s'",
                     qPrintable(m_service));
            return false;
        }
    }

    if (!connection.registerObject(m_path, this, QDBusConnection::ExportAllSlots)) {
        qWarning("[aurobore-notifications] unable to register D-Bus object at '%s'",
                 qPrintable(m_path));
        return false;
    }

    m_dbusRegistered = true;
    qInfo("[aurobore-notifications] D-Bus registered: %s %s",
          qPrintable(m_service), qPrintable(m_path));
    return true;
}

bool NotificationsBridge::isAvailable() const
{
    return m_dbusRegistered && m_router != nullptr;
}

QString NotificationsBridge::dbusService() const
{
    return m_service;
}

QString NotificationsBridge::dbusPath() const
{
    return m_path;
}

QString NotificationsBridge::dbusInterface() const
{
    return m_interface;
}

QVariant NotificationsBridge::remoteAction(const QString &notificationId,
                                             const QString &actionName) const
{
    return Notification::remoteAction(
        actionName.isEmpty() ? QStringLiteral("default") : actionName,
        QString(),
        m_service,
        m_path,
        m_interface,
        QStringLiteral("onNotificationActivated"),
        QVariantList() << notificationId
                       << (actionName.isEmpty() ? QStringLiteral("default") : actionName));
}

void NotificationsBridge::emitTap(const QString &notificationId, const QString &action)
{
    if (!m_router)
        return;

    if (!m_webReady) {
        QVariantMap pending;
        pending.insert(QStringLiteral("id"), notificationId);
        pending.insert(QStringLiteral("action"), action);
        m_pendingTaps.append(pending);
        qInfo("[aurobore-notifications] tap queued (web not ready): %s",
              qPrintable(notificationId));
        return;
    }

    QVariantMap payload;
    payload.insert(QStringLiteral("id"), notificationId);
    payload.insert(QStringLiteral("action"), action);
    m_router->emitEvent(QStringLiteral("notification:tap"), payload);
    qInfo("[aurobore-notifications] tap delivered: %s (%s)",
          qPrintable(notificationId), qPrintable(action));
}

void NotificationsBridge::onNotificationActivated(const QString &notificationId,
                                                  const QString &action)
{
    emitTap(notificationId, action.isEmpty() ? QStringLiteral("default") : action);
}

void NotificationsBridge::setWebReady(bool ready)
{
    m_webReady = ready;
    tryFlushPending();
}

void NotificationsBridge::deliverPending()
{
    setWebReady(true);
}

void NotificationsBridge::tryFlushPending()
{
    if (!m_webReady || !m_router || m_pendingTaps.isEmpty())
        return;

    const QVariantList pending = m_pendingTaps;
    m_pendingTaps.clear();
    for (const QVariant &item : pending) {
        const QVariantMap map = item.toMap();
        emitTap(map.value(QStringLiteral("id")).toString(),
                map.value(QStringLiteral("action"), QStringLiteral("default")).toString());
    }
}
