import QtQuick 2.6

Item {
    id: root

    property var webView
    property var page
    property bool running: false
    property bool started: false
    property int cyclesCompleted: 0
    property bool awaitingReload: false

    function maybeStart() {
        if (started)
            return
        started = true
        running = true
        cyclesCompleted = 0
        console.log("[aurobore-container] W6 dispose test: starting 10 cycles")
        runNextCycle()
    }

    function runNextCycle() {
        if (cyclesCompleted >= 10) {
            running = false
            awaitingReload = false
            return
        }
        var next = cyclesCompleted + 1
        console.log("[aurobore-container] W6 dispose cycle " + next + "/10")
        awaitingReload = true
        page.recreateWebView()
    }

    function onReloadComplete() {
        if (!running || !awaitingReload)
            return
        awaitingReload = false
        cyclesCompleted++
        if (cyclesCompleted >= 10) {
            console.log("[aurobore-container] W6 OK: 10 dispose cycles complete")
            running = false
            return
        }
        runNextCycle()
    }

    Connections {
        target: webView
        onRecvAsyncMessage: {
            if (name === "aurobore:m3-ok")
                root.maybeStart()
        }
        onLoadingChanged: {
            if (loading)
                return
            if (assetServerOrigin && assetServerOrigin.length > 0
                    && url.indexOf(assetServerOrigin) === 0) {
                root.onReloadComplete()
            }
        }
    }
}
