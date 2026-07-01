#ifndef AUROBORE_LIFECYCLE_BRIDGE_H
#define AUROBORE_LIFECYCLE_BRIDGE_H

#include <QObject>

class LifecycleBridge : public QObject
{
    Q_OBJECT

public:
    explicit LifecycleBridge(QObject *parent = nullptr);

signals:
    void lifecycleEvent(const QString &event);

public slots:
    void onApplicationStateChanged(Qt::ApplicationState state);
};

#endif
