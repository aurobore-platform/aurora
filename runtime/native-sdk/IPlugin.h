#ifndef AUROBORE_IPLUGIN_H
#define AUROBORE_IPLUGIN_H

#include <QObject>
#include <QString>
#include <QVariant>

class BridgeRouter;

class IPlugin : public QObject
{
public:
    explicit IPlugin(BridgeRouter *router, QObject *parent = nullptr)
        : QObject(parent)
        , m_router(router)
    {
    }

    virtual ~IPlugin() = default;

    virtual QString displayName() const = 0;

    virtual QVariant invoke(const QString &method, const QVariant &args,
                            const QString &id, bool isStream) = 0;

    virtual void cancel(const QString &id) { Q_UNUSED(id); }

protected:
    BridgeRouter *router() const { return m_router; }

    QVariant makeMethodNotFound(const QString &method) const;
    QVariant makeError(const QString &code, const QString &message,
                       const QVariant &data = QVariant()) const;

    BridgeRouter *m_router = nullptr;
};

#endif
