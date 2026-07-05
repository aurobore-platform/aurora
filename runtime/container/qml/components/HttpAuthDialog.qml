import QtQuick 2.6
import Sailfish.Silica 1.0

Dialog {
    id: root

    property string authHost: ""
    property string authRealm: ""
    property string requestId: ""

    objectName: "httpAuthDialog"
    allowedOrientations: Orientation.All
    canAccept: usernameField.text.length > 0

    function openDialog(requestIdValue, host, realm) {
        requestId = requestIdValue || ""
        authHost = host || ""
        authRealm = realm || ""
        usernameField.text = ""
        passwordField.text = ""
        open()
    }

    onAccepted: {
        if (typeof webViewAuthBridge !== "undefined" && webViewAuthBridge) {
            webViewAuthBridge.provideAuth(
                requestId,
                usernameField.text,
                passwordField.text
            )
        }
    }

    onRejected: {
        if (typeof webViewAuthBridge !== "undefined" && webViewAuthBridge)
            webViewAuthBridge.cancelAuth(requestId)
    }

    SilicaFlickable {
        anchors.fill: parent
        contentHeight: header.height + column.height

        DialogHeader {
            id: header
            title: qsTr("Authentication required")
        }

        Column {
            id: column
            anchors.top: header.bottom
            width: parent.width
            spacing: Theme.paddingMedium

            Label {
                width: parent.width - Theme.horizontalPageMargin * 2
                x: Theme.horizontalPageMargin
                wrapMode: Text.WordWrap
                color: Theme.secondaryHighlightColor
                text: authHost.length > 0
                    ? qsTr("Sign in to %1").arg(authHost)
                    : qsTr("Sign in")
            }

            Label {
                width: parent.width - Theme.horizontalPageMargin * 2
                x: Theme.horizontalPageMargin
                visible: authRealm.length > 0
                wrapMode: Text.WordWrap
                color: Theme.secondaryColor
                text: qsTr("Realm: %1").arg(authRealm)
            }

            TextField {
                id: usernameField
                width: parent.width - Theme.horizontalPageMargin * 2
                x: Theme.horizontalPageMargin
                placeholderText: qsTr("Username")
            }

            PasswordField {
                id: passwordField
                width: parent.width - Theme.horizontalPageMargin * 2
                x: Theme.horizontalPageMargin
                placeholderText: qsTr("Password")
            }
        }
    }
}
