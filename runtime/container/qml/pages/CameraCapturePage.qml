// Camera capture — QtMultimedia 5.x still image.

import QtQuick 2.6
import QtMultimedia 5.0
import Sailfish.Silica 1.0

Page {
    id: capturePage

    property int quality: 80
    property bool allowEditing: false
    property bool delivered: false
    property bool started: false

    allowedOrientations: Orientation.All

    function failUnavailable() {
        if (delivered)
            return
        delivered = true
        if (typeof cameraBridge !== "undefined" && cameraBridge)
            cameraBridge.reportUnavailable()
        if (pageStack.depth > 1)
            pageStack.pop()
    }

    function failCapture(message) {
        if (delivered)
            return
        delivered = true
        if (typeof cameraBridge !== "undefined" && cameraBridge)
            cameraBridge.reportCaptureFailed(message || "capture failed")
        camera.stop()
        if (pageStack.depth > 1)
            pageStack.pop()
    }

    function succeed(path) {
        if (delivered)
            return
        delivered = true
        if (typeof cameraBridge !== "undefined" && cameraBridge)
            cameraBridge.reportCaptureResult(path)
        camera.stop()
        if (pageStack.depth > 1)
            pageStack.pop()
    }

    Camera {
        id: camera

        captureMode: Camera.CaptureStillImage
        focus {
            focusMode: FocusModes.ContinuousAutoFocus
        }

        imageCapture {
            id: imageCapture

            onImageSaved: {
                succeed(path)
            }

            onCaptureFailed: {
                failCapture("capture failed")
            }
        }

        onCameraStatusChanged: {
            if (!started)
                return
            if (cameraStatus === Camera.Unloaded && camera.error !== Camera.NoError)
                failCapture("capture failed")
        }

        onError: {
            if (started)
                failUnavailable()
        }
    }

    VideoOutput {
        id: videoOutput
        anchors.fill: parent
        source: camera
        autoOrientation: true
        fillMode: VideoOutput.PreserveAspectCrop
    }

    IconButton {
        anchors {
            horizontalCenter: parent.horizontalCenter
            bottom: parent.bottom
            bottomMargin: Theme.largeSpacing
        }
        icon.name: "camera"
        visible: camera.cameraStatus === Camera.ActiveStatus
                 && imageCapture.ready
        onClicked: {
            if (!imageCapture.ready) {
                failCapture("capture failed")
                return
            }
            imageCapture.capture()
        }
    }

    BusyIndicator {
        anchors.centerIn: parent
        running: !delivered
                && camera.cameraStatus !== Camera.ActiveStatus
                && camera.cameraStatus !== Camera.Unloaded
        size: BusyIndicatorSize.Large
    }

    Component.onCompleted: {
        if (!camera.available || camera.error !== Camera.NoError) {
            failUnavailable()
            return
        }
        started = true
        camera.start()
    }

    onPageStatusChanged: {
        if (status === PageStatus.Active)
            return
        if (delivered)
            return
        camera.stop()
        if (typeof cameraBridge !== "undefined" && cameraBridge)
            cameraBridge.reportCancelled()
    }

    Component.onDestruction: {
        if (!delivered)
            camera.stop()
    }
}
