#include "ShareBridge.h"

ShareBridge::ShareBridge(QObject *parent)
    : QObject(parent)
{
}

void ShareBridge::requestShareText(const QString &text, const QString &title)
{
    if (m_active)
        return;

    QVariantMap payload;
    payload.insert(QStringLiteral("method"), QStringLiteral("shareText"));
    payload.insert(QStringLiteral("text"), text);
    if (!title.isEmpty())
        payload.insert(QStringLiteral("title"), title);
    beginShare(payload);
}

void ShareBridge::requestShareUrl(const QString &url, const QString &title)
{
    if (m_active)
        return;

    QVariantMap payload;
    payload.insert(QStringLiteral("method"), QStringLiteral("shareUrl"));
    payload.insert(QStringLiteral("url"), url);
    if (!title.isEmpty())
        payload.insert(QStringLiteral("title"), title);
    beginShare(payload);
}

void ShareBridge::requestShareFile(const QString &filePath, const QString &mimeType,
                                   const QString &title)
{
    if (m_active)
        return;

    QVariantMap payload;
    payload.insert(QStringLiteral("method"), QStringLiteral("shareFile"));
    payload.insert(QStringLiteral("filePath"), filePath);
    if (!mimeType.isEmpty())
        payload.insert(QStringLiteral("mimeType"), mimeType);
    if (!title.isEmpty())
        payload.insert(QStringLiteral("title"), title);
    beginShare(payload);
}

void ShareBridge::reportCompleted()
{
    if (!m_active)
        return;
    setActive(false);
    emit shareCompleted();
}

void ShareBridge::reportCancelled()
{
    if (!m_active)
        return;
    setActive(false);
    emit userCancelled();
}

void ShareBridge::reportUnavailable()
{
    if (!m_active)
        return;
    setActive(false);
    emit shareUnavailable();
}

void ShareBridge::dismissActive()
{
    if (!m_active)
        return;
    emit dismissRequested();
}

void ShareBridge::beginShare(const QVariantMap &payload)
{
    setActive(true);
    emit shareRequested(payload);
}

void ShareBridge::setActive(bool active)
{
    if (m_active == active)
        return;
    m_active = active;
    emit activeChanged();
}
