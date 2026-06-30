#ifndef AUROBORE_BRIDGE_ROUTER_H
#define AUROBORE_BRIDGE_ROUTER_H

#include <QObject>
#include <QVariant>

class PluginManager;

class BridgeRouter : public QObject
{
    Q_OBJECT
    Q_PROPERTY(bool trustedOrigin READ trustedOrigin WRITE setTrustedOrigin NOTIFY trustedOriginChanged)

public:
    explicit BridgeRouter(QObject *parent = nullptr);
    ~BridgeRouter() override;

    bool trustedOrigin() const { return m_trustedOrigin; }
    void setTrustedOrigin(bool trusted);

    void setGrantedPermissions(const QStringList &permissions);
    bool initializePlugins();

    Q_INVOKABLE QVariant handleMessage(const QVariant &inbound);

    Q_INVOKABLE void emitEvent(const QString &name, const QVariant &data = QVariant());
    void emitStream(const QString &subscriptionId, const QString &phase,
                    const QVariant &payload = QVariant(), const QVariant &error = QVariant());

    int streamMaxFps(const QString &subscriptionId) const;

    QVariant makeErrorResponse(const QString &id, const QString &code, const QString &message,
                               const QVariant &data = QVariant()) const;
    QVariant makeOkResponse(const QString &id, const QVariant &result) const;
    void emitOutbound(const QVariant &message);

signals:
    void outbound(const QVariant &message);
    void trustedOriginChanged();

private:
    bool m_trustedOrigin = false;
    PluginManager *m_pluginManager = nullptr;
};

#endif
