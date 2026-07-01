#include "CoverBridge.h"

#include "BridgeRouter.h"

#include <QtCore/QVariantMap>

CoverBridge::CoverBridge(BridgeRouter *router, QObject *parent)
    : QObject(parent)
    , m_router(router)
{
}

void CoverBridge::setDefaultAppName(const QString &name)
{
    m_defaultAppName = name;
}

void CoverBridge::setDefaultActions(const QVariantList &actions)
{
    m_defaultActions = actions;
}

void CoverBridge::initializeFromDefaults()
{
    m_primaryText = m_defaultAppName;
    m_secondaryText.clear();
    applyActions(m_defaultActions);
}

void CoverBridge::setState(const QVariantMap &state)
{
    bool changed = false;
    if (state.contains(QStringLiteral("primaryText"))) {
        const QString value = state.value(QStringLiteral("primaryText")).toString();
        if (m_primaryText != value) {
            m_primaryText = value;
            changed = true;
            emit primaryTextChanged();
        }
    }
    if (state.contains(QStringLiteral("secondaryText"))) {
        const QString value = state.value(QStringLiteral("secondaryText")).toString();
        if (m_secondaryText != value) {
            m_secondaryText = value;
            changed = true;
            emit secondaryTextChanged();
        }
    }
    Q_UNUSED(changed);
}

void CoverBridge::setActions(const QVariantList &actions)
{
    applyActions(actions);
}

void CoverBridge::resetToDefaults()
{
    if (m_primaryText != m_defaultAppName) {
        m_primaryText = m_defaultAppName;
        emit primaryTextChanged();
    }
    if (!m_secondaryText.isEmpty()) {
        m_secondaryText.clear();
        emit secondaryTextChanged();
    }
    applyActions(m_defaultActions);
}

void CoverBridge::onActionTriggered(const QString &actionId)
{
    if (actionId.isEmpty())
        return;
    if (!m_webReady || m_appPaused) {
        if (!m_pendingActions.contains(actionId))
            m_pendingActions.append(actionId);
        return;
    }
    deliverAction(actionId);
}

void CoverBridge::onCoverStatusChanged(bool active)
{
    if (!m_router)
        return;
    m_router->emitEvent(active ? QStringLiteral("cover:active")
                               : QStringLiteral("cover:inactive"));
}

void CoverBridge::setWebReady(bool ready)
{
    if (m_webReady == ready)
        return;
    m_webReady = ready;
    if (m_webReady)
        flushPendingActions();
}

void CoverBridge::setAppPaused(bool paused)
{
    m_appPaused = paused;
}

void CoverBridge::onResume()
{
    m_appPaused = false;
    flushPendingActions();
}

void CoverBridge::applyActions(const QVariantList &actions)
{
    if (m_actions == actions)
        return;
    m_actions = actions;
    emit actionsChanged();
}

void CoverBridge::deliverAction(const QString &actionId)
{
    if (!m_router)
        return;
    QVariantMap payload;
    payload.insert(QStringLiteral("id"), actionId);
    m_router->emitEvent(QStringLiteral("cover:action"), payload);
}

void CoverBridge::flushPendingActions()
{
    if (!m_webReady || m_appPaused || m_pendingActions.isEmpty())
        return;
    const QStringList pending = m_pendingActions;
    m_pendingActions.clear();
    for (const QString &actionId : pending)
        deliverAction(actionId);
}
