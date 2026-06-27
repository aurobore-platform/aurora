cmake_minimum_required(VERSION 3.5)

project(ru.auroraos.aurobore-container VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_INCLUDE_CURRENT_DIR ON)

# V-3: libcef в /usr/lib/cef; RPATH для запуска без LD_LIBRARY_PATH.
set(CMAKE_INSTALL_RPATH "$ORIGIN/../lib/cef")
set(CMAKE_BUILD_WITH_INSTALL_RPATH TRUE)

find_package(Qt5 COMPONENTS Core Gui Qml Quick Network REQUIRED)
find_package(PkgConfig REQUIRED)

pkg_check_modules(Auroraapp auroraapp REQUIRED IMPORTED_TARGET)
pkg_check_modules(AuroraWebView aurorawebview REQUIRED IMPORTED_TARGET)

set(PLUGIN_NATIVE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../plugins)
set(NATIVE_SDK_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../native-sdk)
set(BRIDGE_NATIVE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../bridge-native)

add_executable(${PROJECT_NAME}
    src/main.cpp
    src/AppConfig.cpp
    src/AssetResolver.cpp
    src/AssetSchemeServer.cpp
    src/LifecycleBridge.cpp
    generated/PluginRegistry.cpp
    ${BRIDGE_NATIVE_DIR}/BridgeRouter.cpp
    ${NATIVE_SDK_DIR}/IPlugin.cpp
    ${NATIVE_SDK_DIR}/PluginManager.cpp
    ${PLUGIN_NATIVE_DIR}/echo/native/EchoPlugin.cpp
    ${PLUGIN_NATIVE_DIR}/device/native/DevicePlugin.cpp
    ${PLUGIN_NATIVE_DIR}/storage/native/StoragePlugin.cpp
    ${PLUGIN_NATIVE_DIR}/filesystem/native/FileSystemPlugin.cpp
    ${PLUGIN_NATIVE_DIR}/clipboard/native/ClipboardPlugin.cpp
    ${PLUGIN_NATIVE_DIR}/network/native/NetworkPlugin.cpp
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
)

target_link_libraries(${PROJECT_NAME}
    PRIVATE
        Qt5::Core
        Qt5::Gui
        Qt5::Qml
        Qt5::Quick
        Qt5::Network
        PkgConfig::Auroraapp
        PkgConfig::AuroraWebView
)

install(TARGETS ${PROJECT_NAME} RUNTIME DESTINATION bin)
install(DIRECTORY html DESTINATION share/${PROJECT_NAME})
install(DIRECTORY qml DESTINATION share/${PROJECT_NAME})
install(FILES ${PROJECT_NAME}.desktop DESTINATION share/applications)
