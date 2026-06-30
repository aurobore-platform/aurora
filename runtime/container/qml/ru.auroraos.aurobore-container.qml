// Aurobore M1/A2 — ApplicationWindow (Silica), по образцу WebViewBrowser / WebViewAPI.

import QtQuick 2.6
import Sailfish.Silica 1.0
import "pages"

ApplicationWindow {
    id: appWindow

    objectName: "applicationWindow"
    allowedOrientations: defaultAllowedOrientations
    cover: Qt.resolvedUrl("cover/DefaultCover.qml")
    focus: true

    initialPage: Component {
        WebAppPage { }
    }

    // Fallback for devices that deliver back via ApplicationWindow (V-14).
    Keys.onReleased: {
        if (event.key === Qt.Key_Back) {
            event.accepted = true
            var current = pageStack.currentPage
            if (current && typeof current.handleBackNavigation === "function") {
                current.handleBackNavigation()
            }
        }
    }
}
