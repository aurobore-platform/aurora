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
BuildRequires:  pkgconfig(Qt5Multimedia)
BuildRequires:  pkgconfig(aurorawebview)
BuildRequires:  pkgconfig(qca2-qt5)
BuildRequires:  ru.auroraos.webview-devel

Requires:       ru.auroraos.webview
Requires:       qt5-qtmultimedia
Requires:       sailfish-components-pickers-qt5

%global webview_launcher %{_libexecdir}/%{name}/%{name}.webview-subprocess
%global cryptopro_checker %{_libexecdir}/%{name}/ru.auroraos.webview-cryptopro-checker

%description
M1 runtime-контейнер Aurobore: ApplicationWindow + WebView (CEF), asset loader
aurobore-app://, splash, lifecycle, SPA-навигация.

%prep
%setup -q

%build
%cmake -DWEBVIEW_SUBPROCESS_LAUNCHER_INSTALL_PATH=%{webview_launcher} \
       -DWEBVIEW_CRYPTOPRO_CHECKER_INSTALL_PATH=%{cryptopro_checker}
%make_build

%install
%make_install
mkdir -p %{buildroot}/%{_libexecdir}/%{name} && \
  mv %{buildroot}%{_bindir}/%{name}.webview-subprocess %{buildroot}/%{webview_launcher} && \
  chmod +x %{buildroot}/%{webview_launcher} && \
  if test -f %{buildroot}%{_libexecdir}/ru.auroraos.webview-cryptopro-checker; then \
    mv %{buildroot}%{_libexecdir}/ru.auroraos.webview-cryptopro-checker %{buildroot}/%{cryptopro_checker}; \
  else \
    cp -a %{_libexecdir}/ru.auroraos.webview-cryptopro-checker %{buildroot}/%{cryptopro_checker}; \
  fi && \
  chmod +x %{buildroot}/%{cryptopro_checker}

%files
%defattr(-,root,root,-)
%{_bindir}/%{name}
%{webview_launcher}
%{cryptopro_checker}
%{_datadir}/%{name}
%{_datadir}/applications/%{name}.desktop
%{_datadir}/icons/hicolor/86x86/apps/%{name}.png
%{_datadir}/icons/hicolor/108x108/apps/%{name}.png
%{_datadir}/icons/hicolor/128x128/apps/%{name}.png
%{_datadir}/icons/hicolor/172x172/apps/%{name}.png
%{_datadir}/%{name}/translations/*.qm

%changelog
* Sat Jun 27 2026 Aurobore contributors - 0.1.0-1
- M1: минимальный runtime-контейнер.
