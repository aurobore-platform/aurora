#include "BridgeRouter.h"
#include "EchoPlugin.h"

#include <QtCore/QDebug>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QVariantMap>

BridgeRouter::BridgeRouter(QObject *parent)
    : QObject(parent)
    , m_echoPlugin(new EchoPlugin(this, this))
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
        emit outbound(response);
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
            emit outbound(event);
        }
        return QVariant();
    }

    if (type == QStringLiteral("cancel")) {
        const QString id = map.value(QStringLiteral("id")).toString();
        if (!id.isEmpty())
            m_echoPlugin->cancel(id);
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

    if (plugin != QStringLiteral("Echo")) {
        return emitError(id, QStringLiteral("BRIDGE_PLUGIN_NOT_FOUND"),
                         QStringLiteral("Unknown plugin: ") + plugin);
    }

    const QVariant result = m_echoPlugin->invoke(method, args, id, isStream);

    if (method == QStringLiteral("watchTicks") && isStream) {
        return QVariant();
    }

    if (result.type() == QVariant::Map) {
        const QVariantMap resultMap = result.toMap();
        if (resultMap.contains(QStringLiteral("code")) && resultMap.contains(QStringLiteral("message"))) {
            return emitError(id,
                             resultMap.value(QStringLiteral("code")).toString(),
                             resultMap.value(QStringLiteral("message")).toString(),
                             resultMap.value(QStringLiteral("data")));
        }
    }

    if (result.isValid()) {
        const QVariant response = makeOkResponse(id, result);
        emit outbound(response);
        return response;
    }

    return QVariant();
}

void BridgeRouter::emitEvent(const QString &name, const QVariant &data)
{
    QVariantMap event;
    event.insert(QStringLiteral("type"), QStringLiteral("event"));
    event.insert(QStringLiteral("name"), name);
    if (data.isValid())
        event.insert(QStringLiteral("data"), data);
    emit outbound(event);
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
    emit outbound(stream);
}
