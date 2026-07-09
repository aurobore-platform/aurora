import QtQuick 2.6
import Sailfish.Silica 1.0

CoverBackground {
    objectName: "previewCover"

    readonly property var bridge: (typeof coverBridge !== "undefined") ? coverBridge : null
    readonly property string launcherIcon: (typeof appIconPath !== "undefined") ? appIconPath : ""

    Image {
        anchors.fill: parent
        visible: bridge && bridge.previewSource.length > 0
        source: bridge && bridge.previewSource.length > 0 ? bridge.previewSource : ""
        fillMode: Image.PreserveAspectCrop
        opacity: 0.9
    }

    CoverTemplate {
        objectName: "applicationCover"
        primaryText: bridge && bridge.primaryText.length > 0
                         ? bridge.primaryText
                         : qsTr("AUROBORE_APP_NAME")
        secondaryText: bridge ? bridge.secondaryText : ""

        icon {
            visible: launcherIcon.length > 0
                     && (!bridge || bridge.previewSource.length === 0)
            source: launcherIcon.length > 0 ? "file://" + launcherIcon : ""
            sourceSize {
                width: icon.width
                height: icon.height
            }
        }
    }

    CoverActionList {
        enabled: bridge && bridge.actions.length > 0

        Repeater {
            model: bridge ? bridge.actions : []
            CoverAction {
                objectName: modelData.label || modelData.id
                iconSource: modelData.icon
                              ? "image://theme/" + modelData.icon
                              : "image://theme/icon-m-action"
                onTriggered: bridge.onActionTriggered(modelData.id)
            }
        }
    }

    onStatusChanged: {
        if (status !== undefined && bridge)
            bridge.onCoverStatusChanged(status === Cover.Active)
    }
}
