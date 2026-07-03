cmake_minimum_required(VERSION 3.5)

project(ru.auroraos.aurobore-container VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_INCLUDE_CURRENT_DIR ON)

# V-3: libcef в /usr/lib/cef; RPATH для запуска без LD_LIBRARY_PATH.
set(CMAKE_INSTALL_RPATH "$ORIGIN/../lib/cef")
set(CMAKE_BUILD_WITH_INSTALL_RPATH TRUE)

find_package(Qt5 COMPONENTS Core Gui Qml Quick Network Multimedia Positioning Sensors DBus LinguistTools REQUIRED)
find_package(PkgConfig REQUIRED)

pkg_check_modules(Auroraapp auroraapp REQUIRED IMPORTED_TARGET)
pkg_check_modules(AuroraWebView aurorawebview REQUIRED IMPORTED_TARGET)
pkg_check_modules(Nemonotifications nemonotifications-qt5 REQUIRED IMPORTED_TARGET)

file(GLOB TsFiles "${CMAKE_CURRENT_SOURCE_DIR}/translations/*.ts")
qt5_add_translation(QmFiles ${TsFiles})

set(PLUGIN_NATIVE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../plugins)
set(NATIVE_SDK_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../native-sdk)
set(BRIDGE_NATIVE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../bridge-native)

add_executable(${PROJECT_NAME}
    src/main.cpp
    src/AppConfig.cpp
    src/AssetResolver.cpp
    src/AssetSchemeServer.cpp
    src/LoopbackTlsCredentials.cpp
    src/LifecycleBridge.cpp
    src/DeepLinkHandler.cpp
    src/CoverBridge.cpp
    src/CoverPlugin.cpp
    generated/PluginRegistry.cpp
    ${BRIDGE_NATIVE_DIR}/BridgeRouter.cpp
    ${NATIVE_SDK_DIR}/IPlugin.cpp
    ${NATIVE_SDK_DIR}/PluginManager.cpp
    ${NATIVE_SDK_DIR}/ResourceRef.cpp
    ${NATIVE_SDK_DIR}/ScopeValidator.cpp
    ${NATIVE_SDK_DIR}/StreamPublisher.cpp
    ${PLUGIN_NATIVE_DIR}/echo/native/EchoPlugin.cpp
    ${PLUGIN_NATIVE_DIR}/device/native/DevicePlugin.cpp
    ${PLUGIN_NATIVE_DIR}/storage/native/StoragePlugin.cpp
    ${PLUGIN_NATIVE_DIR}/filesystem/native/FileSystemPlugin.cpp
    ${PLUGIN_NATIVE_DIR}/clipboard/native/ClipboardPlugin.cpp
    ${PLUGIN_NATIVE_DIR}/network/native/NetworkPlugin.cpp
    ${PLUGIN_NATIVE_DIR}/camera/native/CameraBridge.cpp
    ${PLUGIN_NATIVE_DIR}/camera/native/CameraPlugin.cpp
    ${PLUGIN_NATIVE_DIR}/geolocation/native/GeolocationMapping.cpp
    ${PLUGIN_NATIVE_DIR}/geolocation/native/GeolocationPlugin.cpp
    ${PLUGIN_NATIVE_DIR}/notifications/native/NotificationsBridge.cpp
    ${PLUGIN_NATIVE_DIR}/notifications/native/NotificationsPlugin.cpp
    ${PLUGIN_NATIVE_DIR}/share/native/ShareBridge.cpp
    ${PLUGIN_NATIVE_DIR}/share/native/SharePlugin.cpp
    ${PLUGIN_NATIVE_DIR}/sensors/native/SensorsMapping.cpp
    ${PLUGIN_NATIVE_DIR}/sensors/native/SensorsPlugin.cpp
    ${QmFiles}
)

target_include_directories(${PROJECT_NAME} PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/generated
    ${BRIDGE_NATIVE_DIR}
    ${NATIVE_SDK_DIR}
    ${PLUGIN_NATIVE_DIR}/echo/native
    ${PLUGIN_NATIVE_DIR}/device/native
    ${PLUGIN_NATIVE_DIR}/storage/native
    ${PLUGIN_NATIVE_DIR}/filesystem/native
    ${PLUGIN_NATIVE_DIR}/clipboard/native
    ${PLUGIN_NATIVE_DIR}/network/native
    ${PLUGIN_NATIVE_DIR}/camera/native
    ${PLUGIN_NATIVE_DIR}/geolocation/native
    ${PLUGIN_NATIVE_DIR}/notifications/native
    ${PLUGIN_NATIVE_DIR}/share/native
    ${PLUGIN_NATIVE_DIR}/sensors/native
)

target_link_libraries(${PROJECT_NAME}
    PRIVATE
        Qt5::Core
        Qt5::Gui
        Qt5::Qml
        Qt5::Quick
        Qt5::Network
        Qt5::Multimedia
        Qt5::Positioning
        Qt5::Sensors
        Qt5::DBus
        PkgConfig::Auroraapp
        PkgConfig::AuroraWebView
        PkgConfig::Nemonotifications
)

install(TARGETS ${PROJECT_NAME} RUNTIME DESTINATION bin)
install(DIRECTORY html DESTINATION share/${PROJECT_NAME})
install(DIRECTORY qml DESTINATION share/${PROJECT_NAME})
install(DIRECTORY config DESTINATION share/${PROJECT_NAME})
install(DIRECTORY tls DESTINATION share/${PROJECT_NAME})
install(FILES ${PROJECT_NAME}.desktop DESTINATION share/applications)

set(AUROBORE_ICON_SIZES 86x86 108x108 128x128 172x172)
foreach(_icon_size IN LISTS AUROBORE_ICON_SIZES)
    install(FILES icons/${_icon_size}/${PROJECT_NAME}.png
        DESTINATION share/icons/hicolor/${_icon_size}/apps)
endforeach()

foreach(_qm IN LISTS QmFiles)
    install(FILES ${_qm} DESTINATION share/${PROJECT_NAME}/translations)
endforeach()
