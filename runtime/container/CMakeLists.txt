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
find_package(aurora_libaurorawebview QUIET)

pkg_check_modules(Auroraapp auroraapp REQUIRED IMPORTED_TARGET)
pkg_check_modules(Nemonotifications nemonotifications-qt5 REQUIRED IMPORTED_TARGET)
pkg_check_modules(qca2-qt5 REQUIRED IMPORTED_TARGET qca2-qt5)

if(aurora_libaurorawebview_FOUND)
    get_property(CEF_LIBS_PATH GLOBAL PROPERTY aurora_libcef_PROPERTY_LIBS_PATH)
    get_property(WEBVIEW_LIBS_PATH GLOBAL PROPERTY aurora_libaurorawebview_PROPERTY_LIBS_PATH)
    set_property(GLOBAL PROPERTY CEF_LINK_PROPERTY
        "-L${WEBVIEW_LIBS_PATH}" "-laurorawebview" "-Wl,--no-as-needed"
        ${CEF_LIBS_PATH}/libcef.so "-Wl,--as-needed")
    set(AUROBORE_WEBVIEW_TARGET aurora_libaurorawebview::aurora_libaurorawebview)
else()
    message(STATUS "aurora_libaurorawebview not found; using pkgconfig(aurorawebview)")
    set(AUROBORE_WEBVIEW_TARGET PkgConfig::AuroraWebView)
endif()

pkg_check_modules(AuroraWebView aurorawebview REQUIRED IMPORTED_TARGET)

if(NOT WEBVIEW_SUBPROCESS_LAUNCHER_INSTALL_PATH)
    message(FATAL_ERROR "WEBVIEW_SUBPROCESS_LAUNCHER_INSTALL_PATH is required")
endif()
if(NOT WEBVIEW_CRYPTOPRO_CHECKER_INSTALL_PATH)
    message(FATAL_ERROR "WEBVIEW_CRYPTOPRO_CHECKER_INSTALL_PATH is required")
endif()
add_compile_definitions(
    WEBVIEW_SUBPROCESS_LAUNCHER_INSTALL_PATH="${WEBVIEW_SUBPROCESS_LAUNCHER_INSTALL_PATH}"
    WEBVIEW_CRYPTOPRO_CHECKER_INSTALL_PATH="${WEBVIEW_CRYPTOPRO_CHECKER_INSTALL_PATH}")

include(CheckCXXSourceCompiles)
set(CMAKE_REQUIRED_INCLUDES ${AuroraWebView_INCLUDE_DIRS})
set(CMAKE_REQUIRED_LIBRARIES ${AuroraWebView_LINK_LIBRARIES})
check_cxx_source_compiles([=[
#include <aurorawebview/webenginecontext.h>
int main(int argc, char **argv) {
  return Aurora::WebView::WebEngineContext::StartSubprocess(argc, argv);
}
]=] AUROBORE_WEBVIEW_HAS_START_SUBPROCESS)
if(AUROBORE_WEBVIEW_HAS_START_SUBPROCESS)
    add_compile_definitions(AUROBORE_WEBVIEW_HAS_START_SUBPROCESS)
    message(STATUS "WebView: StartSubprocess available — custom browser subprocess enabled")
else()
    message(STATUS "WebView: StartSubprocess unavailable (SDK 5.2.x) — RPM bundles subprocess, runtime uses system CEF helper")
endif()

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

get_property(CEF_LINK_PROPERTY GLOBAL PROPERTY CEF_LINK_PROPERTY)
if(CEF_LINK_PROPERTY)
    target_link_options(${PROJECT_NAME} PRIVATE ${CEF_LINK_PROPERTY})
endif()

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
        ${AUROBORE_WEBVIEW_TARGET}
        PkgConfig::Nemonotifications
        PkgConfig::qca2-qt5
)

set(SUBPROCESS_NAME ${PROJECT_NAME}.webview-subprocess)
add_executable(${SUBPROCESS_NAME} src/webview_subprocess_main.cpp)

target_link_options(${SUBPROCESS_NAME} PRIVATE "-Wl,--no-as-needed")
target_link_libraries(${SUBPROCESS_NAME} PRIVATE
    ${AUROBORE_WEBVIEW_TARGET}
    Qt5::Core
)
set_target_properties(${SUBPROCESS_NAME} PROPERTIES INSTALL_RPATH "$ORIGIN/../../lib/cef")

install(TARGETS ${PROJECT_NAME} RUNTIME DESTINATION bin)
install(TARGETS ${SUBPROCESS_NAME} RUNTIME DESTINATION bin)
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
