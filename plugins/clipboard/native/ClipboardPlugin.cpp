#include "ClipboardPlugin.h"

#include "PluginRegistry.h"
#include <QtCore/QVariantMap>
#include <QtGui/QClipboard>
#include <QtGui/QGuiApplication>

ClipboardPlugin::ClipboardPlugin(BridgeRouter *bridgeRouter, QObject *parent)
    : IPlugin(bridgeRouter, parent)
{
}

QString ClipboardPlugin::displayName() const
{
    return QStringLiteral("Clipboard");
}

QVariant ClipboardPlugin::invoke(const QString &method, const QVariant &args,
                                   const QString &id, bool isStream)
{
    Q_UNUSED(id);
    Q_UNUSED(isStream);

    QClipboard *clipboard = QGuiApplication::clipboard();
    if (!clipboard) {
        return makeError(QStringLiteral("CLIPBOARD_UNAVAILABLE"),
                         QStringLiteral("Clipboard not available"));
    }

    if (method == QStringLiteral("copy")) {
        const QString text = args.toMap().value(QStringLiteral("text")).toString();
        clipboard->setText(text);
        return QVariant(true);
    }

    if (method == QStringLiteral("paste")) {
        QVariantMap result;
        result.insert(QStringLiteral("text"), clipboard->text());
        return result;
    }

    return makeMethodNotFound(method);
}

IPlugin *createClipboardPlugin(BridgeRouter *router)
{
    return new ClipboardPlugin(router);
}
