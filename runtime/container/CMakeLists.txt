cmake_minimum_required(VERSION 3.5)

project(ru.auroraos.aurobore-container VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_INCLUDE_CURRENT_DIR ON)

# V-3: libcef в /usr/lib/cef; RPATH для запуска без LD_LIBRARY_PATH.
set(CMAKE_INSTALL_RPATH "$ORIGIN/../lib/cef")
set(CMAKE_BUILD_WITH_INSTALL_RPATH TRUE)

find_package(Qt5 COMPONENTS Core Gui Qml Quick REQUIRED)
find_package(PkgConfig REQUIRED)

pkg_check_modules(Auroraapp auroraapp REQUIRED IMPORTED_TARGET)
pkg_check_modules(AuroraWebView aurorawebview REQUIRED IMPORTED_TARGET)

add_executable(${PROJECT_NAME}
    src/main.cpp
    src/AppConfig.cpp
    src/AssetResolver.cpp
    src/LifecycleBridge.cpp
)

target_link_libraries(${PROJECT_NAME}
    PRIVATE
        Qt5::Core
        Qt5::Gui
        Qt5::Qml
        Qt5::Quick
        PkgConfig::Auroraapp
        PkgConfig::AuroraWebView
)

install(TARGETS ${PROJECT_NAME} RUNTIME DESTINATION bin)
install(DIRECTORY html DESTINATION share/${PROJECT_NAME})
install(DIRECTORY qml DESTINATION share/${PROJECT_NAME})
install(FILES ${PROJECT_NAME}.desktop DESTINATION share/applications)
