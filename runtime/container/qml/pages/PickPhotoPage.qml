// Gallery picker — Sailfish.Pickers ImagePickerPage.

import QtQuick 2.6
import Sailfish.Silica 1.0
import Sailfish.Pickers 1.0

ImagePickerPage {
    id: pickerPage

    property bool allowEditing: false
    property bool delivered: false

    onSelectedContentPropertiesChanged: {
        if (!selectedContentProperties)
            return
        var filePath = selectedContentProperties.filePath
        if (!filePath || filePath.length === 0)
            return

        delivered = true
        if (typeof cameraBridge !== "undefined" && cameraBridge) {
            var mime = selectedContentProperties.mimeType || "image/jpeg"
            cameraBridge.reportPickResult(filePath, mime)
        }
        if (pageStack.depth > 1)
            pageStack.pop()
    }

    onPageStatusChanged: {
        if (status === PageStatus.Active)
            return
        if (delivered)
            return
        if (typeof cameraBridge !== "undefined" && cameraBridge)
            cameraBridge.reportCancelled()
    }
}
