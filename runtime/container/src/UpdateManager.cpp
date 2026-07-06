#include "UpdateManager.h"

#include "AppConfig.h"
#include "AssetResolver.h"
#include "BridgeRouter.h"

#include <QtCore/QCryptographicHash>
#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QJsonArray>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QRegularExpression>
#include <QtCore/QSaveFile>
#include <QtCore/QStandardPaths>
#include <QtCore/QUrl>
#include <QtCore/QVersionNumber>
#include <QtNetwork/QNetworkReply>
#include <QtNetwork/QNetworkRequest>

#include <QtCrypto>

#include <zlib.h>

#include <cstring>

namespace {

const char kRuntimeVersion[] = "0.0.3";

QString jsonString(const QJsonObject &obj, const QString &key)
{
    return obj.value(key).toString();
}

QByteArray ed25519SpkiFromRaw(const QByteArray &raw32)
{
    static const QByteArray prefix = QByteArray::fromHex("302a300506032b6570032100");
    return prefix + raw32;
}

QString canonicalManifestJson(const QJsonObject &manifest)
{
    QJsonObject ordered;
    ordered.insert(QStringLiteral("manifestVersion"), manifest.value(QStringLiteral("manifestVersion")));
    ordered.insert(QStringLiteral("bundleVersion"), manifest.value(QStringLiteral("bundleVersion")));
    ordered.insert(QStringLiteral("bundleFormat"), manifest.value(QStringLiteral("bundleFormat")));
    ordered.insert(QStringLiteral("channel"), manifest.value(QStringLiteral("channel")));
    ordered.insert(QStringLiteral("entry"), manifest.value(QStringLiteral("entry")));
    ordered.insert(QStringLiteral("minOs"), manifest.value(QStringLiteral("minOs")));
    ordered.insert(QStringLiteral("minRuntimeVersion"), manifest.value(QStringLiteral("minRuntimeVersion")));
    ordered.insert(QStringLiteral("publishedAt"), manifest.value(QStringLiteral("publishedAt")));
    ordered.insert(QStringLiteral("runtimeVersion"), manifest.value(QStringLiteral("runtimeVersion")));
    ordered.insert(QStringLiteral("sha256"), manifest.value(QStringLiteral("sha256")));
    ordered.insert(QStringLiteral("size"), manifest.value(QStringLiteral("size")));
    return QString::fromUtf8(QJsonDocument(ordered).toJson(QJsonDocument::Compact));
}

bool verifyManifestSignature(const QJsonObject &manifest, const QString &publicKeyBase64)
{
    const QString signatureB64 = jsonString(manifest, QStringLiteral("signature"));
    if (signatureB64.isEmpty())
        return false;

    QJsonObject payload = manifest;
    payload.remove(QStringLiteral("signature"));
    const QByteArray message = canonicalManifestJson(payload).toUtf8();
    const QByteArray signature = QByteArray::fromBase64(signatureB64.toUtf8());
    const QByteArray publicKeyRaw = QByteArray::fromBase64(publicKeyBase64.toUtf8());
    if (publicKeyRaw.size() != 32)
        return false;

    const QCA::PublicKey publicKey =
        QCA::PublicKey::fromDER(ed25519SpkiFromRaw(publicKeyRaw));
    if (!publicKey.canVerify())
        return false;

    const QCA::Signature sig = QCA::convert<QCA::Signature>(signature);
    const QCA::SecureArray msg(message);
    QCA::MessageContext ctx(QStringLiteral("RAW"));
    return publicKey.verifyMessage(sig, msg, ctx);
}

bool gunzip(const QByteArray &input, QByteArray *output, QString *error)
{
    z_stream strm;
    memset(&strm, 0, sizeof(strm));
    if (inflateInit2(&strm, 16 + MAX_WBITS) != Z_OK) {
        if (error)
            *error = QStringLiteral("gzip init failed");
        return false;
    }

    strm.avail_in = static_cast<uInt>(input.size());
    strm.next_in = reinterpret_cast<Bytef *>(const_cast<char *>(input.data()));

    const int chunk = 16384;
    int ret = Z_OK;
    while (ret == Z_OK) {
        const int oldSize = output->size();
        output->resize(oldSize + chunk);
        strm.avail_out = chunk;
        strm.next_out = reinterpret_cast<Bytef *>(output->data() + oldSize);
        ret = inflate(&strm, Z_NO_FLUSH);
        output->resize(oldSize + chunk - strm.avail_out);
    }

    inflateEnd(&strm);
    if (ret != Z_STREAM_END) {
        if (error)
            *error = QStringLiteral("gzip inflate failed");
        output->clear();
        return false;
    }
    return true;
}

quint64 parseOctalField(const char *field, int width)
{
    QByteArray bytes(field, width);
    bool ok = false;
    const quint64 value = bytes.trimmed().toULongLong(&ok, 8);
    return ok ? value : 0;
}

bool extractTar(const QByteArray &tarData, const QString &destDir, QString *error)
{
    QDir().mkpath(destDir);
    int offset = 0;
    while (offset + 512 <= tarData.size()) {
        const char *header = tarData.constData() + offset;
        bool empty = true;
        for (int i = 0; i < 512; ++i) {
            if (header[i] != '\0') {
                empty = false;
                break;
            }
        }
        if (empty)
            break;

        const QString name = QString::fromLatin1(header, 100).trimmed();
        const QString prefix = QString::fromLatin1(header + 345, 155).trimmed();
        QString fullName = prefix.isEmpty() ? name : prefix + QLatin1Char('/') + name;
        fullName = QDir::cleanPath(fullName);
        if (fullName.startsWith(QLatin1Char('/')) || fullName.contains(QStringLiteral(".."))) {
            if (error)
                *error = QStringLiteral("unsafe tar path");
            return false;
        }

        const char typeFlag = header[156];
        const quint64 size = parseOctalField(header + 124, 12);
        offset += 512;

        if (typeFlag == '0' || typeFlag == '\0') {
            const QString outPath = QDir(destDir).filePath(fullName);
            QDir().mkpath(QFileInfo(outPath).absolutePath());
            QFile out(outPath);
            if (!out.open(QIODevice::WriteOnly)) {
                if (error)
                    *error = QStringLiteral("tar write failed");
                return false;
            }
            if (static_cast<qint64>(offset + size) > tarData.size()) {
                if (error)
                    *error = QStringLiteral("tar truncated");
                return false;
            }
            out.write(tarData.constData() + offset, static_cast<qint64>(size));
            out.close();
        }

        const quint64 padded = ((size + 511) / 512) * 512;
        offset += static_cast<int>(padded);
    }
    return true;
}

} // namespace

UpdateManager::UpdateManager(AssetResolver *resolver, BridgeRouter *router, QObject *parent)
    : QObject(parent)
    , m_resolver(resolver)
    , m_router(router)
{
    connect(&m_checkTimer, &QTimer::timeout, this, &UpdateManager::onCheckTimer);
    connect(&m_readyTimer, &QTimer::timeout, this, &UpdateManager::onReadyTimeout);
    m_readyTimer.setSingleShot(true);
}

QString UpdateManager::updatesRoot() const
{
    if (!m_resolver)
        return QString();
    const QString appData = m_resolver->appDataRoot();
    if (appData.isEmpty())
        return QString();
    return QDir(appData).filePath(QStringLiteral("aurobore/updates"));
}

QString UpdateManager::activeDir() const
{
    return QDir(updatesRoot()).filePath(QStringLiteral("active"));
}

QString UpdateManager::stagingDir() const
{
    return QDir(updatesRoot()).filePath(QStringLiteral("staging"));
}

QString UpdateManager::previousDir() const
{
    return QDir(updatesRoot()).filePath(QStringLiteral("previous"));
}

QString UpdateManager::stateFilePath() const
{
    return QDir(updatesRoot()).filePath(QStringLiteral("state.json"));
}

bool UpdateManager::removeDirRecursive(const QString &path)
{
    QDir dir(path);
    if (!dir.exists())
        return true;
    return dir.removeRecursively();
}

bool UpdateManager::moveDir(const QString &from, const QString &to)
{
    QDir parent = QFileInfo(to).absoluteDir();
    parent.mkpath(QStringLiteral("."));
    if (QDir().exists(to) && !removeDirRecursive(to))
        return false;
    return QDir().rename(from, to);
}

bool UpdateManager::loadState(QVariantMap *state) const
{
    QFile file(stateFilePath());
    if (!file.open(QIODevice::ReadOnly))
        return false;
    const QJsonDocument doc = QJsonDocument::fromJson(file.readAll());
    if (!doc.isObject())
        return false;
    *state = doc.object().toVariantMap();
    return true;
}

bool UpdateManager::saveState(const QVariantMap &state) const
{
    QDir().mkpath(updatesRoot());
    QSaveFile file(stateFilePath());
    if (!file.open(QIODevice::WriteOnly))
        return false;
    file.write(QJsonDocument::fromVariant(state).toJson(QJsonDocument::Compact));
    return file.commit();
}

bool UpdateManager::isBundleDirValid(const QString &dir, const QString &entry) const
{
    const QString entryPath = QDir(dir).filePath(entry);
    return QFileInfo::exists(entryPath);
}

bool UpdateManager::bootstrapActiveBundle()
{
    const Aurobore::UpdatesConfig config = Aurobore::AppConfig::updates();
    if (!config.enabled || !m_resolver)
        return false;

    QVariantMap state;
    if (!loadState(&state)) {
        state.insert(QStringLiteral("activeVersion"), Aurobore::AppConfig::appVersion());
        saveState(state);
    } else if (!state.contains(QStringLiteral("activeVersion"))) {
        state.insert(QStringLiteral("activeVersion"), Aurobore::AppConfig::appVersion());
        saveState(state);
    }

    const QString entry = state.value(QStringLiteral("activeEntry"),
                                    QStringLiteral("index.html")).toString();
    const QString active = activeDir();
    if (!isBundleDirValid(active, entry))
        return false;

    m_resolver->setWebRoot(active);
    qInfo("[aurobore-updates] bootstrap active bundle from %s", qPrintable(active));
    return true;
}

void UpdateManager::start()
{
    const Aurobore::UpdatesConfig config = Aurobore::AppConfig::updates();
    if (!config.enabled)
        return;

    if (config.checkOnResume)
        scheduleCheck(2000);

    m_checkTimer.setInterval(qMax(config.checkIntervalMs, 60000));
    m_checkTimer.start();
}

void UpdateManager::scheduleCheck(int delayMs)
{
    QTimer::singleShot(delayMs, this, &UpdateManager::checkNow);
}

void UpdateManager::onLifecycleEvent(const QString &event)
{
    const Aurobore::UpdatesConfig config = Aurobore::AppConfig::updates();
    if (!config.enabled || !config.checkOnResume)
        return;
    if (event == QStringLiteral("resume"))
        scheduleCheck(500);
}

void UpdateManager::emitUpdateEvent(const QString &name, const QVariantMap &payload)
{
    if (m_router)
        m_router->emitEvent(name, payload);
}

QVariantMap UpdateManager::buildStatus() const
{
    QVariantMap state;
    loadState(&state);
    QVariantMap status;
    status.insert(QStringLiteral("activeVersion"), state.value(QStringLiteral("activeVersion")));
    status.insert(QStringLiteral("previousVersion"), state.value(QStringLiteral("previousVersion")));
    status.insert(QStringLiteral("pendingVersion"), state.value(QStringLiteral("pendingVersion")));
    status.insert(QStringLiteral("phase"), static_cast<int>(m_phase));
    return status;
}

int UpdateManager::compareBundleVersion(const QString &a, const QString &b) const
{
    const QVersionNumber va = QVersionNumber::fromString(a);
    const QVersionNumber vb = QVersionNumber::fromString(b);
    return QVersionNumber::compare(va, vb);
}

void UpdateManager::checkNow()
{
    const Aurobore::UpdatesConfig config = Aurobore::AppConfig::updates();
    if (!config.enabled || config.url.isEmpty() || config.publicKey.isEmpty())
        return;
    if (m_phase != Phase::Idle)
        return;

    const QString latestUrl =
        QString(config.url).replace(QRegularExpression(QStringLiteral("/+$")), QString())
        + QLatin1Char('/') + config.channel + QStringLiteral("/latest.json");
    m_phase = Phase::Checking;
    m_downloadBuffer.clear();
    m_downloadKind = QStringLiteral("latest");

    QNetworkRequest request(latestUrl);
    request.setAttribute(QNetworkRequest::FollowRedirectsAttribute, true);
    QNetworkReply *reply = m_network.get(request);
    connect(reply, &QNetworkReply::finished, this, &UpdateManager::onNetworkFinished);
}

void UpdateManager::onNetworkFinished()
{
    QNetworkReply *reply = qobject_cast<QNetworkReply *>(sender());
    if (!reply)
        return;
    reply->deleteLater();

    if (reply->error() != QNetworkReply::NoError) {
        qWarning("[aurobore-updates] network error: %s", qPrintable(reply->errorString()));
        m_phase = Phase::Idle;
        emitUpdateEvent(QStringLiteral("update:error"),
                        {{QStringLiteral("message"), reply->errorString()}});
        return;
    }

    m_downloadBuffer.append(reply->readAll());

    if (m_downloadKind == QStringLiteral("latest")) {
        const QJsonDocument doc = QJsonDocument::fromJson(m_downloadBuffer);
        if (!doc.isObject()) {
            m_phase = Phase::Idle;
            emitUpdateEvent(QStringLiteral("update:error"),
                            {{QStringLiteral("message"), QStringLiteral("invalid latest.json")}});
            return;
        }
        const QJsonObject latest = doc.object();
        const QString manifestUrl = jsonString(latest, QStringLiteral("manifestUrl"));
        const QString bundleUrl = jsonString(latest, QStringLiteral("bundleUrl"));
        const QString remoteVersion = jsonString(latest, QStringLiteral("bundleVersion"));
        m_pendingBundleUrl = jsonString(latest, QStringLiteral("bundleUrl"));

        QVariantMap state;
        loadState(&state);
        const QString activeVersion = state.value(QStringLiteral("activeVersion")).toString();
        if (!remoteVersion.isEmpty() && !activeVersion.isEmpty()
            && compareBundleVersion(remoteVersion, activeVersion) <= 0) {
            m_phase = Phase::Idle;
            return;
        }

        emitUpdateEvent(QStringLiteral("update:available"),
                        {{QStringLiteral("bundleVersion"), remoteVersion}});

        m_downloadKind = QStringLiteral("manifest");
        m_downloadBuffer.clear();
        QNetworkRequest request(QUrl(manifestUrl));
        QNetworkReply *manifestReply = m_network.get(request);
        connect(manifestReply, &QNetworkReply::finished, this, &UpdateManager::onNetworkFinished);
        return;
    }

    if (m_downloadKind == QStringLiteral("manifest")) {
        const QJsonDocument doc = QJsonDocument::fromJson(m_downloadBuffer);
        if (!doc.isObject()) {
            m_phase = Phase::Idle;
            emitUpdateEvent(QStringLiteral("update:error"),
                            {{QStringLiteral("message"), QStringLiteral("invalid manifest")}});
            return;
        }
        const QJsonObject manifest = doc.object();
        const Aurobore::UpdatesConfig config = Aurobore::AppConfig::updates();
        if (!verifyManifestSignature(manifest, config.publicKey)) {
            m_phase = Phase::Idle;
            emitUpdateEvent(QStringLiteral("update:error"),
                            {{QStringLiteral("message"), QStringLiteral("signature verify failed")}});
            return;
        }

        m_pendingManifest = manifest.toVariantMap();
        if (m_pendingBundleUrl.isEmpty()) {
            m_phase = Phase::Idle;
            emitUpdateEvent(QStringLiteral("update:error"),
                            {{QStringLiteral("message"), QStringLiteral("missing bundleUrl")}});
            return;
        }

        m_phase = Phase::Downloading;
        m_downloadKind = QStringLiteral("bundle");
        m_downloadBuffer.clear();
        QNetworkRequest request(QUrl(m_pendingBundleUrl));
        QNetworkReply *bundleReply = m_network.get(request);
        connect(bundleReply, &QNetworkReply::finished, this, &UpdateManager::onNetworkFinished);
        return;
    }

    if (m_downloadKind == QStringLiteral("bundle")) {
        const QByteArray bundle = m_downloadBuffer;
        const QString expectedSha = m_pendingManifest.value(QStringLiteral("sha256")).toString();
        const QByteArray actualSha =
            QCryptographicHash::hash(bundle, QCryptographicHash::Sha256).toHex();
        if (QString::fromLatin1(actualSha) != expectedSha) {
            m_phase = Phase::Idle;
            emitUpdateEvent(QStringLiteral("update:error"),
                            {{QStringLiteral("message"), QStringLiteral("sha256 mismatch")}});
            return;
        }

        QByteArray tarData;
        QString gunzipError;
        if (!gunzip(bundle, &tarData, &gunzipError)) {
            m_phase = Phase::Idle;
            emitUpdateEvent(QStringLiteral("update:error"),
                            {{QStringLiteral("message"), gunzipError}});
            return;
        }

        removeDirRecursive(stagingDir());
        QString tarError;
        if (!extractTar(tarData, stagingDir(), &tarError)) {
            m_phase = Phase::Idle;
            emitUpdateEvent(QStringLiteral("update:error"),
                            {{QStringLiteral("message"), tarError}});
            return;
        }

        QVariantMap state;
        loadState(&state);
        state.insert(QStringLiteral("pendingVersion"),
                     m_pendingManifest.value(QStringLiteral("bundleVersion")));
        saveState(state);

        emitUpdateEvent(QStringLiteral("update:ready"),
                        {{QStringLiteral("bundleVersion"),
                          m_pendingManifest.value(QStringLiteral("bundleVersion"))}});

        beginApplyAfterStaging(m_pendingManifest);
    }
}

void UpdateManager::beginApplyAfterStaging(const QVariantMap &manifest)
{
    m_phase = Phase::Applying;
    const QString entry = manifest.value(QStringLiteral("entry"), QStringLiteral("index.html")).toString();
    if (!isBundleDirValid(stagingDir(), entry)) {
        finishApplyFailure(QStringLiteral("staged bundle missing entry"));
        return;
    }

    if (QDir().exists(activeDir())) {
        removeDirRecursive(previousDir());
        if (!moveDir(activeDir(), previousDir())) {
            finishApplyFailure(QStringLiteral("failed to archive previous bundle"));
            return;
        }
    }

    if (!moveDir(stagingDir(), activeDir())) {
        finishApplyFailure(QStringLiteral("failed to activate staged bundle"));
        return;
    }

    QVariantMap state;
    loadState(&state);
    const QString previousVersion = state.value(QStringLiteral("activeVersion")).toString();
    const QString newVersion = manifest.value(QStringLiteral("bundleVersion")).toString();
    state.insert(QStringLiteral("previousVersion"), previousVersion);
    state.insert(QStringLiteral("activeVersion"), newVersion);
    state.insert(QStringLiteral("activeEntry"), entry);
    state.remove(QStringLiteral("pendingVersion"));
    saveState(state);

    if (m_resolver)
        m_resolver->setWebRoot(activeDir());

    m_pendingEntry = entry;
    m_pendingVersion = newVersion;
    m_phase = Phase::WaitingReady;
    m_readyTimer.start(Aurobore::AppConfig::splashTimeoutMs());
    emit reloadEntryRequested();
}

void UpdateManager::applyPending()
{
    if (!QDir().exists(stagingDir())) {
        emitUpdateEvent(QStringLiteral("update:error"),
                        {{QStringLiteral("message"), QStringLiteral("no staged update")}});
        return;
    }
    beginApplyAfterStaging(m_pendingManifest);
}

void UpdateManager::rollbackNow()
{
    if (!QDir().exists(previousDir())) {
        emitUpdateEvent(QStringLiteral("update:error"),
                        {{QStringLiteral("message"), QStringLiteral("no previous bundle")}});
        return;
    }

    QVariantMap state;
    loadState(&state);
    const QString entry = state.value(QStringLiteral("activeEntry"), QStringLiteral("index.html")).toString();

    removeDirRecursive(stagingDir());
    if (QDir().exists(activeDir()))
        removeDirRecursive(activeDir());
    moveDir(previousDir(), activeDir());

    const QString rolledBack = state.value(QStringLiteral("previousVersion")).toString();
    state.insert(QStringLiteral("activeVersion"), rolledBack);
    state.remove(QStringLiteral("previousVersion"));
    saveState(state);

    if (m_resolver)
        m_resolver->setWebRoot(activeDir());

    m_phase = Phase::WaitingReady;
    m_readyTimer.start(Aurobore::AppConfig::splashTimeoutMs());
    emit reloadEntryRequested();
    emitUpdateEvent(QStringLiteral("update:applied"),
                    {{QStringLiteral("bundleVersion"), rolledBack},
                     {QStringLiteral("rolledBack"), true}});
}

void UpdateManager::onAppReady()
{
    if (m_phase != Phase::WaitingReady)
        return;
    m_readyTimer.stop();
    m_phase = Phase::Idle;
    emitUpdateEvent(QStringLiteral("update:applied"),
                    {{QStringLiteral("bundleVersion"), m_pendingVersion}});
    m_pendingVersion.clear();
}

void UpdateManager::onReadyTimeout()
{
    if (m_phase != Phase::WaitingReady)
        return;
    qWarning("[aurobore-updates] ready timeout — rolling back");
    finishApplyFailure(QStringLiteral("ready timeout"));
    rollbackNow();
}

void UpdateManager::finishApplySuccess()
{
    m_phase = Phase::Idle;
}

void UpdateManager::finishApplyFailure(const QString &message)
{
    m_phase = Phase::Idle;
    emitUpdateEvent(QStringLiteral("update:error"), {{QStringLiteral("message"), message}});
}
