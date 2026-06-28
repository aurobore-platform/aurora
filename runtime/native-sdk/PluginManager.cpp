#include "PluginManager.h"

#include "IPlugin.h"
#include "PluginRegistry.h"

#include "BridgeRouter.h"

#include <QtCore/QDebug>

#include <exception>

PluginManager::PluginManager(BridgeRouter *router, QObject *parent)
    : QObject(parent)
    , m_router(router)
{
}

PluginManager::~PluginManager()
{
    qDeleteAll(m_plugins);
    m_plugins.clear();
}

void PluginManager::setGrantedPermissions(const QStringList &permissions)
{
    m_grantedPermissions = permissions;
}

bool PluginManager::loadFromRegistry()
{
    const QList<PluginDescriptor> descriptors = PluginRegistry::descriptors();
    bool anyLoaded = false;

    for (const PluginDescriptor &descriptor : descriptors) {
        if (descriptor.bridgeProtocol != 1) {
            qWarning("[aurobore-plugin] skip %s: bridgeProtocol %d",
                     qPrintable(descriptor.display), descriptor.bridgeProtocol);
            continue;
        }

        IPlugin *plugin = PluginRegistry::createPlugin(descriptor.display, m_router);
        if (!plugin) {
            qWarning("[aurobore-plugin] skip %s: factory returned null",
                     qPrintable(descriptor.display));
            continue;
        }

        m_descriptors.insert(descriptor.display, descriptor);
        m_plugins.insert(descriptor.display, plugin);
        anyLoaded = true;
        qInfo("[aurobore-plugin] registered %s v%s (%d methods)",
              qPrintable(descriptor.display),
              qPrintable(descriptor.version),
              descriptor.methods.size());
    }

    return anyLoaded;
}

bool PluginManager::hasRequiredPermissions(const PluginDescriptor &descriptor) const
{
    for (const QString &perm : descriptor.permissions) {
        if (!m_grantedPermissions.contains(perm)) {
            return false;
        }
    }
    return true;
}

bool PluginManager::isMethodAllowed(const PluginDescriptor &descriptor,
                                    const QString &method) const
{
    return descriptor.methods.contains(method);
}

QVariant PluginManager::permissionDenied(const QString &plugin, const QString &id) const
{
    QVariantMap error;
    error.insert(QStringLiteral("code"), QStringLiteral("BRIDGE_PERMISSION_DENIED"));
    error.insert(QStringLiteral("message"),
                 QStringLiteral("Missing permission for plugin: ") + plugin);
    return m_router->makeErrorResponse(id, error.value(QStringLiteral("code")).toString(),
                                       error.value(QStringLiteral("message")).toString());
}

QVariant PluginManager::dispatchInvoke(const QString &plugin, const QString &method,
                                         const QVariant &args, const QString &id, bool isStream)
{
    auto emitAndReturn = [this](const QVariant &response) -> QVariant {
        if (response.isValid())
            m_router->emitOutbound(response);
        return response;
    };

    IPlugin *instance = m_plugins.value(plugin, nullptr);
    if (!instance) {
        return emitAndReturn(m_router->makeErrorResponse(id, QStringLiteral("BRIDGE_PLUGIN_NOT_FOUND"),
                                                         QStringLiteral("Unknown plugin: ") + plugin));
    }

    const PluginDescriptor descriptor = m_descriptors.value(plugin);
    if (!isMethodAllowed(descriptor, method)) {
        return emitAndReturn(m_router->makeErrorResponse(id, QStringLiteral("BRIDGE_METHOD_NOT_FOUND"),
                                                         QStringLiteral("Unknown method: ") + method));
    }

    if (!hasRequiredPermissions(descriptor)) {
        return emitAndReturn(permissionDenied(plugin, id));
    }

    try {
        const QVariant result = instance->invoke(method, args, id, isStream);
        if (result.type() == QVariant::Map) {
            const QVariantMap resultMap = result.toMap();
            if (resultMap.contains(QStringLiteral("code"))
                && resultMap.contains(QStringLiteral("message"))) {
                return emitAndReturn(m_router->makeErrorResponse(
                    id,
                    resultMap.value(QStringLiteral("code")).toString(),
                    resultMap.value(QStringLiteral("message")).toString(),
                    resultMap.value(QStringLiteral("data"))));
            }
        }

        if (isStream && result.isNull()) {
            return QVariant();
        }

        if (result.isValid()) {
            return emitAndReturn(m_router->makeOkResponse(id, result));
        }

        return QVariant();
    } catch (const std::exception &ex) {
        qWarning("[aurobore-plugin] %s.%s exception: %s",
                 qPrintable(plugin), qPrintable(method), ex.what());
        return emitAndReturn(m_router->makeErrorResponse(
            id,
            QStringLiteral("RUNTIME_PLUGIN_ERROR"),
            QString::fromUtf8(ex.what())));
    } catch (...) {
        qWarning("[aurobore-plugin] %s.%s unhandled exception",
                 qPrintable(plugin), qPrintable(method));
        return emitAndReturn(m_router->makeErrorResponse(
            id,
            QStringLiteral("RUNTIME_PLUGIN_ERROR"),
            QStringLiteral("Unhandled native exception")));
    }
}

void PluginManager::dispatchCancel(const QString &plugin, const QString &id)
{
    IPlugin *instance = m_plugins.value(plugin, nullptr);
    if (!instance)
        return;

    try {
        instance->cancel(id);
    } catch (const std::exception &ex) {
        qWarning("[aurobore-plugin] %s cancel exception: %s",
                 qPrintable(plugin), ex.what());
    } catch (...) {
        qWarning("[aurobore-plugin] %s cancel unhandled exception",
                 qPrintable(plugin));
    }
}

QStringList PluginManager::registeredPlugins() const
{
    return m_plugins.keys();
}
