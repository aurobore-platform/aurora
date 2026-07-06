#ifndef AUROBORE_UPDATE_MANAGER_H
#define AUROBORE_UPDATE_MANAGER_H

#include <QObject>
#include <QTimer>
#include <QNetworkAccessManager>

class AssetResolver;
class BridgeRouter;

class UpdateManager : public QObject
{
    Q_OBJECT

public:
    explicit UpdateManager(AssetResolver *resolver, BridgeRouter *router,
                           QObject *parent = nullptr);

    bool bootstrapActiveBundle();
    void start();

public slots:
    void checkNow();
    void applyPending();
    void rollbackNow();
    void onAppReady();
    void onLifecycleEvent(const QString &event);
    QVariantMap buildStatus() const;

signals:
    void reloadEntryRequested();

private slots:
    void onCheckTimer();
    void onReadyTimeout();
    void onNetworkFinished();

private:
    enum class Phase {
        Idle,
        Checking,
        Downloading,
        Applying,
        WaitingReady,
    };

    QString updatesRoot() const;
    QString activeDir() const;
    QString stagingDir() const;
    QString previousDir() const;
    QString stateFilePath() const;

    void emitUpdateEvent(const QString &name, const QVariantMap &payload = QVariantMap());
    bool loadState(QVariantMap *state) const;
    bool saveState(const QVariantMap &state) const;
    bool isBundleDirValid(const QString &dir, const QString &entry) const;
    bool removeDirRecursive(const QString &path);
    bool moveDir(const QString &from, const QString &to);
    void scheduleCheck(int delayMs);
    void beginApplyAfterStaging(const QVariantMap &manifest);
    void finishApplySuccess();
    void finishApplyFailure(const QString &message);
    int compareBundleVersion(const QString &a, const QString &b) const;

    AssetResolver *m_resolver = nullptr;
    BridgeRouter *m_router = nullptr;
    QNetworkAccessManager m_network;
    QTimer m_checkTimer;
    QTimer m_readyTimer;
    Phase m_phase = Phase::Idle;
    QString m_pendingEntry;
    QString m_pendingVersion;
    QString m_bundledWebRoot;
    QByteArray m_downloadBuffer;
    QString m_downloadKind;
    QString m_pendingBundleUrl;
    QVariantMap m_pendingManifest;
};

#endif
