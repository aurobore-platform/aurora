#ifndef AUROBORE_DEEP_LINK_HANDLER_H
#define AUROBORE_DEEP_LINK_HANDLER_H

#include <QObject>
#include <QString>
#include <QStringList>

class BridgeRouter;

class DeepLinkHandler : public QObject
{
    Q_OBJECT

public:
    explicit DeepLinkHandler(BridgeRouter *router, QObject *parent = nullptr);

    void setSchemes(const QStringList &schemes);
    void captureFromArguments(const QStringList &arguments);

public slots:
    void setWebReady(bool ready);
    void deliverPending();

private:
    bool matchesScheme(const QString &url) const;
    void queueUrl(const QString &url);
    void tryDeliver();

    BridgeRouter *m_router = nullptr;
    QStringList m_schemes;
    QString m_pendingUrl;
    bool m_webReady = false;
};

#endif
