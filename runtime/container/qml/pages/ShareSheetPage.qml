// System share sheet — Sailfish.Share ShareAction.

import QtQuick 2.6
import Sailfish.Silica 1.0
import Sailfish.Share 1.0

Page {
    id: sharePage

    property string method: ""
    property string text: ""
    property string url: ""
    property string filePath: ""
    property string mimeType: ""
    property string title: ""

    property bool triggered: false
    property bool finished: false

    allowedOrientations: Orientation.All

    ShareAction {
        id: shareAction
    }

    function sheetTitle() {
        if (title && title.length > 0)
            return title
        if (method === "shareUrl")
            return qsTr("Share link")
        if (method === "shareFile")
            return qsTr("Share file")
        return qsTr("Share")
    }

    function configureAndTrigger() {
        shareAction.title = sheetTitle()

        if (method === "shareText") {
            shareAction.mimeType = "text/plain"
            shareAction.resources = [{
                "name": text,
                "data": text,
                "type": "text/plain",
                "status": text
            }]
        } else if (method === "shareUrl") {
            shareAction.mimeType = "text/x-url"
            shareAction.resources = [{
                "type": "text/x-url",
                "linkTitle": title && title.length > 0 ? title : url,
                "status": url
            }]
        } else if (method === "shareFile") {
            shareAction.mimeType = mimeType && mimeType.length > 0 ? mimeType : "*/*"
            shareAction.resources = [filePath]
        } else {
            if (typeof shareBridge !== "undefined" && shareBridge)
                shareBridge.reportUnavailable()
            return
        }

        try {
            shareAction.trigger()
            triggered = true
        } catch (e) {
            console.log("[aurobore-container] ShareAction.trigger failed:", e)
            if (typeof shareBridge !== "undefined" && shareBridge)
                shareBridge.reportUnavailable()
        }
    }

    function finishCompleted() {
        if (finished)
            return
        finished = true
        if (typeof shareBridge !== "undefined" && shareBridge)
            shareBridge.reportCompleted()
        if (pageStack.depth > 1)
            pageStack.pop()
    }

    function finishCancelled() {
        if (finished)
            return
        finished = true
        if (typeof shareBridge !== "undefined" && shareBridge)
            shareBridge.reportCancelled()
        if (pageStack.depth > 1)
            pageStack.pop()
    }

    Component.onCompleted: configureAndTrigger()

    onPageStatusChanged: {
        if (status === PageStatus.Active)
            return
        if (finished)
            return
        if (triggered)
            finishCompleted()
        else
            finishCancelled()
    }

    Keys.onReleased: {
        if (event.key === Qt.Key_Back) {
            event.accepted = true
            finishCancelled()
        }
    }
}
