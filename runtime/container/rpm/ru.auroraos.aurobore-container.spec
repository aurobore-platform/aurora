Name:       ru.auroraos.aurobore-container
Summary:    Aurobore M1 — минимальный runtime-контейнер (WebView + aurobore-app://)
Version:    0.1.0
Release:    1
License:    MIT
URL:        https://github.com/aurobore-platform/aurora
Source0:    %{name}-%{version}.tar.bz2

BuildRequires:  cmake
BuildRequires:  pkgconfig(auroraapp)
BuildRequires:  pkgconfig(Qt5Core)
BuildRequires:  pkgconfig(Qt5Gui)
BuildRequires:  pkgconfig(Qt5Qml)
BuildRequires:  pkgconfig(Qt5Quick)
BuildRequires:  pkgconfig(aurorawebview)
BuildRequires:  ru.auroraos.webview-devel

Requires:       ru.auroraos.webview

%description
M1 runtime-контейнер Aurobore: ApplicationWindow + WebView (CEF), asset loader
aurobore-app://, splash, lifecycle, SPA-навигация.

%prep
%setup -q

%build
%cmake
%make_build

%install
%make_install

%files
%defattr(-,root,root,-)
%{_bindir}/%{name}
%{_datadir}/%{name}
%{_datadir}/applications/%{name}.desktop
%{_datadir}/icons/hicolor/86x86/apps/%{name}.png
%{_datadir}/icons/hicolor/108x108/apps/%{name}.png
%{_datadir}/icons/hicolor/128x128/apps/%{name}.png
%{_datadir}/icons/hicolor/172x172/apps/%{name}.png

%changelog
* Sat Jun 27 2026 Aurobore contributors - 0.1.0-1
- M1: минимальный runtime-контейнер.
