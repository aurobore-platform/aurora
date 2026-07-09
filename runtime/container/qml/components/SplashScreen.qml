import QtQuick 2.6
import Sailfish.Silica 1.0

Item {
    id: splash

    readonly property string gradStart: (typeof splashGradientStart !== "undefined" && splashGradientStart)
                                        ? splashGradientStart : "#1a1a2e"
    readonly property string gradEnd: (typeof splashGradientEnd !== "undefined" && splashGradientEnd)
                                      ? splashGradientEnd : gradStart
    readonly property string iconPath: (typeof appIconPath !== "undefined") ? appIconPath : ""
    readonly property string customImage: (typeof splashImagePath !== "undefined") ? splashImagePath : ""
    readonly property bool showAppName: (typeof splashShowName !== "undefined") && splashShowName

    Rectangle {
        anchors.fill: parent
        gradient: Gradient {
            GradientStop { position: 0.0; color: gradStart }
            GradientStop { position: 1.0; color: gradEnd }
        }
    }

    Image {
        anchors.fill: parent
        visible: customImage.length > 0
        source: customImage.length > 0 ? "file://" + customImage : ""
        fillMode: Image.PreserveAspectCrop
    }

    Image {
        id: appIcon
        anchors.centerIn: parent
        visible: customImage.length === 0 && iconPath.length > 0
        source: iconPath.length > 0 ? "file://" + iconPath : ""
        width: Theme.iconSizeHuge * 2
        height: width
        fillMode: Image.PreserveAspectFit
    }

    BusyIndicator {
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.top: appIcon.visible ? appIcon.bottom : parent.verticalCenter
        anchors.topMargin: Theme.paddingLarge
        running: splash.visible
    }

    Label {
        anchors.horizontalCenter: parent.horizontalCenter
        anchors.bottom: parent.bottom
        anchors.bottomMargin: Theme.paddingLarge
        visible: showAppName
        color: Theme.highlightColor
        text: qsTr("AUROBORE_APP_NAME")
        font.pixelSize: Theme.fontSizeSmall
    }
}
