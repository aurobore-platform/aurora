Name:       ru.auroraos.poc-bridge
Summary:    Aurobore PoC — эхо-мост web<->native на ru.auroraos.WebView
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

# V-2: рантайм-RPM — ru.auroraos.webview (devel — ru.auroraos.webview-devel).
Requires:       ru.auroraos.webview

%description
Proof-of-concept нативного контейнера Aurobore: демонстрирует двусторонний асинхронный мост
между веб-страницей и нативным кодом через штатный API ru.auroraos.WebView
(sendAsyncMessage / onRecvAsyncMessage / runJavaScript).

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

%changelog
* Sat Jun 27 2026 Aurobore contributors - 0.1.0-1
- M0 Spike: первый PoC эхо-моста.
