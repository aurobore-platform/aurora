// Aurobore M1 — ApplicationWindow (Silica), по образцу WebViewBrowser / WebViewAPI.

import QtQuick 2.6
import Sailfish.Silica 1.0
import "pages"

ApplicationWindow {
    id: appWindow

    objectName: "applicationWindow"
    allowedOrientations: defaultAllowedOrientations
    cover: Qt.resolvedUrl("cover/DefaultCover.qml")
    initialPage: Component {
        WebAppPage { }
    }
}
