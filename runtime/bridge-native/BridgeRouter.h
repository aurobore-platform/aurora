#ifndef AUROBORE_BRIDGE_ROUTER_H
#define AUROBORE_BRIDGE_ROUTER_H

#include <QObject>
#include <QVariant>

class EchoPlugin;

class BridgeRouter : public QObject
{
    Q_OBJECT
    Q_PROPERTY(bool trustedOrigin READ trustedOrigin WRITE setTrustedOrigin NOTIFY trustedOriginChanged)

public:
    explicit BridgeRouter(QObject *parent = nullptr);
    ~BridgeRouter() override;

    bool trustedOrigin() const { return m_trustedOrigin; }
    void setTrustedOrigin(bool trusted);

    Q_INVOKABLE QVariant handleMessage(const QVariant &inbound);

    Q_INVOKABLE void emitEvent(const QString &name, const QVariant &data = QVariant());
    void emitStream(const QString &subscriptionId, const QString &phase,
                    const QVariant &payload = QVariant(), const QVariant &error = QVariant());

signals:
    void outbound(const QVariant &message);
    void trustedOriginChanged();

private:
    QVariant makeErrorResponse(const QString &id, const QString &code, const QString &message,
                               const QVariant &data = QVariant()) const;
    QVariant makeOkResponse(const QString &id, const QVariant &result) const;

    bool m_trustedOrigin = true;
    EchoPlugin *m_echoPlugin = nullptr;
};

#endif
