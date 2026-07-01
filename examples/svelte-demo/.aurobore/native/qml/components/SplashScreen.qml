import QtQuick 2.6
import Sailfish.Silica 1.0

Rectangle {
    id: splash

    color: "#1a1a2e"

    Label {
        anchors.centerIn: parent
        text: qsTr("AUROBORE_APP_NAME")
        font.pixelSize: Theme.fontSizeHuge
        color: Theme.highlightColor
    }

    BusyIndicator {
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: parent.bottom
        anchors.bottomMargin: Theme.paddingLarge * 3
        running: splash.visible
    }

    Label {
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: parent.bottom
        anchors.bottomMargin: Theme.paddingLarge
        color: Theme.highlightColor
        text: qsTr("AUROBORE_APP_NAME")
        font.pixelSize: Theme.fontSizeSmall
    }
}
