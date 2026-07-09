#ifndef AUROBORE_COVER_BRIDGE_H
#define AUROBORE_COVER_BRIDGE_H

#include <QObject>
#include <QString>
#include <QStringList>
#include <QVariant>
#include <QVariantList>
#include <QVariantMap>

class BridgeRouter;

class CoverBridge : public QObject
{
    Q_OBJECT
    Q_PROPERTY(QString primaryText READ primaryText NOTIFY primaryTextChanged)
    Q_PROPERTY(QString secondaryText READ secondaryText NOTIFY secondaryTextChanged)
    Q_PROPERTY(QVariantList actions READ actions NOTIFY actionsChanged)
    Q_PROPERTY(QString previewSource READ previewSource NOTIFY previewSourceChanged)

public:
    explicit CoverBridge(BridgeRouter *router, QObject *parent = nullptr);

    QString primaryText() const { return m_primaryText; }
    QString secondaryText() const { return m_secondaryText; }
    QVariantList actions() const { return m_actions; }
    QString previewSource() const { return m_previewSource; }

    void setDefaultAppName(const QString &name);
    void setDefaultActions(const QVariantList &actions);
    void initializeFromDefaults();

    Q_INVOKABLE void setState(const QVariantMap &state);
    Q_INVOKABLE void setActions(const QVariantList &actions);
    Q_INVOKABLE void resetToDefaults();
    Q_INVOKABLE void onActionTriggered(const QString &actionId);
    Q_INVOKABLE void onCoverStatusChanged(bool active);
    Q_INVOKABLE void setPreviewSource(const QString &source);
    Q_INVOKABLE void setWebReady(bool ready);
    void setAppPaused(bool paused);
    void onResume();

signals:
    void primaryTextChanged();
    void secondaryTextChanged();
    void actionsChanged();
    void previewSourceChanged();

private:
    void applyActions(const QVariantList &actions);
    void deliverAction(const QString &actionId);
    void flushPendingActions();

    BridgeRouter *m_router = nullptr;
    QString m_defaultAppName;
    QVariantList m_defaultActions;
    QString m_primaryText;
    QString m_secondaryText;
    QVariantList m_actions;
    QString m_previewSource;
    QStringList m_pendingActions;
    bool m_webReady = false;
    bool m_appPaused = false;
};

#endif
