import QtQuick 2.6
import Sailfish.Silica 1.0

CoverBackground {
    objectName: "defaultCover"

    CoverTemplate {
        objectName: "applicationCover"
        primaryText: coverBridge.primaryText
        secondaryText: coverBridge.secondaryText.length > 0
                         ? coverBridge.secondaryText
                         : qsTr("AUROBORE_APP_NAME")
    }

    CoverActionList {
        enabled: coverBridge.actions.length > 0

        Repeater {
            model: coverBridge.actions
            CoverAction {
                iconSource: modelData.icon
                              ? "image://theme/" + modelData.icon
                              : "image://theme/icon-m-action"
                onTriggered: coverBridge.onActionTriggered(modelData.id)
            }
        }
    }

    onStatusChanged: {
        if (status !== undefined)
            coverBridge.onCoverStatusChanged(status === Cover.Active)
    }
}
