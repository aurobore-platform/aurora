"use strict";
(() => {
  // ../core/dist/mocks/defaults.js
  var MOCK_SAFE_AREA_INSETS = {
    top: 32,
    right: 0,
    bottom: 0,
    left: 0
  };

  // src/web-shim.ts
  function injectInsets(top, right, bottom, left) {
    const root = document.documentElement;
    root.style.setProperty("--aurobore-safe-area-top", `${top}px`);
    root.style.setProperty("--aurobore-safe-area-right", `${right}px`);
    root.style.setProperty("--aurobore-safe-area-bottom", `${bottom}px`);
    root.style.setProperty("--aurobore-safe-area-left", `${left}px`);
    root.style.setProperty("--safe-area-inset-top", `${top}px`);
    root.style.setProperty("--safe-area-inset-right", `${right}px`);
    root.style.setProperty("--safe-area-inset-bottom", `${bottom}px`);
    root.style.setProperty("--safe-area-inset-left", `${left}px`);
  }
  function emitNativeEvent(name, data) {
    const g = window;
    g.__auroboreBridgeEmit?.(name, data);
  }
  function bootstrap() {
    const { top, right, bottom, left } = MOCK_SAFE_AREA_INSETS;
    injectInsets(top, right, bottom, left);
    const tryEmit = () => {
      const g = window;
      if (!g.__auroboreBridgeEmit) {
        requestAnimationFrame(tryEmit);
        return;
      }
      emitNativeEvent("ready");
      emitNativeEvent("systemChrome:insetsChanged", { top, right, bottom, left });
    };
    tryEmit();
    document.addEventListener("visibilitychange", () => {
      emitNativeEvent(document.hidden ? "pause" : "resume");
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
