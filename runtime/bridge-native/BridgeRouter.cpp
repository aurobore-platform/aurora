#include "BridgeRouter.h"

#include "PluginManager.h"
#include "IPlugin.h"

#include <QtCore/QDebug>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QVariantMap>

BridgeRouter::BridgeRouter(QObject *parent)
    : QObject(parent)
    , m_pluginManager(new PluginManager(this, this))
{
}

BridgeRouter::~BridgeRouter() = default;

void BridgeRouter::setTrustedOrigin(bool trusted)
{
    if (m_trustedOrigin == trusted)
        return;
    m_trustedOrigin = trusted;
    emit trustedOriginChanged();
}

void BridgeRouter::setGrantedPermissions(const QStringList &permissions)
{
    m_pluginManager->setGrantedPermissions(permissions);
}

bool BridgeRouter::initializePlugins()
{
    const bool loaded = m_pluginManager->loadFromRegistry();
    if (loaded) {
        qInfo("[aurobore-bridge-native] M3 plugins: %s",
              qPrintable(m_pluginManager->registeredPlugins().join(QStringLiteral(", "))));
    }
    return loaded;
}

void BridgeRouter::registerBuiltInPlugin(const PluginDescriptor &descriptor, IPlugin *instance)
{
    if (m_pluginManager)
        m_pluginManager->registerBuiltInPlugin(descriptor, instance);
}

void BridgeRouter::emitOutbound(const QVariant &message)
{
    emit outbound(message);
}

QVariant BridgeRouter::handleMessage(const QVariant &inbound)
{
    QVariant parsed = inbound;
    if (inbound.type() == QVariant::String) {
        const QJsonDocument doc = QJsonDocument::fromJson(inbound.toString().toUtf8());
        if (doc.isObject()) {
            parsed = doc.object().toVariantMap();
        }
    }

    auto emitError = [this](const QString &id, const QString &code, const QString &message,
                            const QVariant &data = QVariant()) -> QVariant {
        const QVariant response = makeErrorResponse(id, code, message, data);
        emitOutbound(response);
        return response;
    };

    if (!m_trustedOrigin) {
        const QVariantMap map = parsed.toMap();
        const QString id = map.value(QStringLiteral("id")).toString();
        return emitError(id, QStringLiteral("BRIDGE_PERMISSION_DENIED"),
                         QStringLiteral("Untrusted origin"));
    }

    const QVariantMap map = parsed.toMap();
    const QString type = map.value(QStringLiteral("type")).toString();

    if (type == QStringLiteral("event")) {
        const QString name = map.value(QStringLiteral("name")).toString();
        const QVariant data = map.value(QStringLiteral("data"));
        qInfo("[aurobore-bridge-native] event: %s", qPrintable(name));
        if (name == QStringLiteral("app:demo")) {
            QVariantMap event;
            event.insert(QStringLiteral("type"), QStringLiteral("event"));
            event.insert(QStringLiteral("name"), QStringLiteral("app:echo"));
            if (data.isValid())
                event.insert(QStringLiteral("data"), data);
            emitOutbound(event);
        }
        return QVariant();
    }

    if (type == QStringLiteral("cancel")) {
        const QString id = map.value(QStringLiteral("id")).toString();
        if (!id.isEmpty())
            m_pluginManager->dispatchCancelById(id);
        return QVariant();
    }

    if (type != QStringLiteral("invoke")) {
        const QString id = map.value(QStringLiteral("id")).toString();
        return emitError(id, QStringLiteral("BRIDGE_PROTOCOL_MISMATCH"),
                         QStringLiteral("Unknown message type"));
    }

    const int protocol = map.value(QStringLiteral("protocol")).toInt();
    if (protocol != 1) {
        const QString id = map.value(QStringLiteral("id")).toString();
        return emitError(id, QStringLiteral("BRIDGE_PROTOCOL_MISMATCH"),
                         QStringLiteral("Unsupported protocol version"));
    }

    const QString id = map.value(QStringLiteral("id")).toString();
    const QString plugin = map.value(QStringLiteral("plugin")).toString();
    const QString method = map.value(QStringLiteral("method")).toString();
    const QVariant args = map.value(QStringLiteral("args"));
    const QVariant metaVar = map.value(QStringLiteral("meta"));
    const QVariantMap meta = metaVar.toMap();
    const bool isStream = meta.value(QStringLiteral("stream")).toBool();

    if (plugin.isEmpty() || method.isEmpty()) {
        return emitError(id, QStringLiteral("BRIDGE_INVALID_ARGS"),
                         QStringLiteral("plugin and method required"));
    }

    return m_pluginManager->dispatchInvoke(plugin, method, args, id, isStream, meta);
}

void BridgeRouter::emitEvent(const QString &name, const QVariant &data)
{
    QVariantMap event;
    event.insert(QStringLiteral("type"), QStringLiteral("event"));
    event.insert(QStringLiteral("name"), name);
    if (data.isValid())
        event.insert(QStringLiteral("data"), data);
    emitOutbound(event);
}

QVariant BridgeRouter::makeErrorResponse(const QString &id, const QString &code, const QString &message,
                                          const QVariant &data) const
{
    QVariantMap error;
    error.insert(QStringLiteral("code"), code);
    error.insert(QStringLiteral("message"), message);
    if (data.isValid())
        error.insert(QStringLiteral("data"), data);

    QVariantMap response;
    response.insert(QStringLiteral("type"), QStringLiteral("response"));
    response.insert(QStringLiteral("id"), id);
    response.insert(QStringLiteral("ok"), false);
    response.insert(QStringLiteral("error"), error);
    return response;
}

QVariant BridgeRouter::makeOkResponse(const QString &id, const QVariant &result) const
{
    QVariantMap response;
    response.insert(QStringLiteral("type"), QStringLiteral("response"));
    response.insert(QStringLiteral("id"), id);
    response.insert(QStringLiteral("ok"), true);
    response.insert(QStringLiteral("result"), result);
    return response;
}

void BridgeRouter::emitStream(const QString &subscriptionId, const QString &phase,
                              const QVariant &payload, const QVariant &error)
{
    QVariantMap stream;
    stream.insert(QStringLiteral("type"), QStringLiteral("stream"));
    stream.insert(QStringLiteral("subscriptionId"), subscriptionId);
    stream.insert(QStringLiteral("phase"), phase);
    if (payload.isValid())
        stream.insert(QStringLiteral("payload"), payload);
    if (error.isValid())
        stream.insert(QStringLiteral("error"), error);
    emitOutbound(stream);

    if (phase == QStringLiteral("complete") || phase == QStringLiteral("error"))
        m_pluginManager->unregisterStream(subscriptionId);
}

int BridgeRouter::streamMaxFps(const QString &subscriptionId) const
{
    return m_pluginManager->streamMaxFps(subscriptionId);
}
