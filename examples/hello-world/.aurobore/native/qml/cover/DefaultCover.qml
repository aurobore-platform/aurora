import QtQuick 2.6
import Sailfish.Silica 1.0

CoverBackground {
    objectName: "defaultCover"

    readonly property var bridge: (typeof coverBridge !== "undefined") ? coverBridge : null

    CoverTemplate {
        objectName: "applicationCover"
        primaryText: bridge && bridge.primaryText.length > 0
                         ? bridge.primaryText
                         : qsTr("AUROBORE_APP_NAME")
        secondaryText: bridge ? bridge.secondaryText : ""
    }

    CoverActionList {
        enabled: bridge && bridge.actions.length > 0

        Repeater {
            model: bridge ? bridge.actions : []
            CoverAction {
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
