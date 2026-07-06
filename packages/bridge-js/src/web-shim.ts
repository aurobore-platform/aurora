/**
 * Lifecycle + system chrome shim для browser mock mode.
 * Загружается после aurobore-bridge-web.js.
 */
import { MOCK_SAFE_AREA_INSETS } from "@aurobore/core";

function injectInsets(top: number, right: number, bottom: number, left: number): void {
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

function emitNativeEvent(name: string, data?: unknown): void {
  const g = window as unknown as { __auroboreBridgeEmit?: (n: string, d?: unknown) => void };
  g.__auroboreBridgeEmit?.(name, data);
}

function bootstrap(): void {
  const { top, right, bottom, left } = MOCK_SAFE_AREA_INSETS;
  injectInsets(top, right, bottom, left);

  const tryEmit = (): void => {
    const g = window as unknown as { __auroboreBridgeEmit?: (n: string, d?: unknown) => void };
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
