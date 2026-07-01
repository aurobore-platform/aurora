#include "LifecycleBridge.h"

#include <QtGui/QGuiApplication>

LifecycleBridge::LifecycleBridge(QObject *parent)
    : QObject(parent)
{
}

void LifecycleBridge::onApplicationStateChanged(Qt::ApplicationState state)
{
    switch (state) {
    case Qt::ApplicationActive:
        emit lifecycleEvent(QStringLiteral("resume"));
        break;
    case Qt::ApplicationInactive:
    case Qt::ApplicationSuspended:
        emit lifecycleEvent(QStringLiteral("pause"));
        break;
    default:
        break;
    }
}
