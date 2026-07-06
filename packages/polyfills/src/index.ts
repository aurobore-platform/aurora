import { installClipboardPolyfill } from "./clipboard.js";
import { installGeolocationPolyfill } from "./geolocation.js";
import { installMediaDevicesPolyfill } from "./media-devices.js";
import { installNotificationPolyfill } from "./notification.js";
import { installSharePolyfill } from "./share.js";
import { DEFAULT_POLYFILL_IDS, type InstallPolyfillsOptions, type PolyfillId } from "./types.js";

const INSTALLERS: Record<PolyfillId, () => void> = {
  geolocation: installGeolocationPolyfill,
  share: installSharePolyfill,
  notification: installNotificationPolyfill,
  clipboard: installClipboardPolyfill,
  mediaDevices: installMediaDevicesPolyfill,
};

function waitForBridge(): Promise<void> {
  const g = globalThis as { Aurobore?: unknown };
  if (g.Aurobore) return Promise.resolve();
  return new Promise((resolve) => {
    const tick = (): void => {
      if (g.Aurobore) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

/** Устанавливает W3C polyfills поверх плагинов Aurobore. */
export async function installPolyfills(options: InstallPolyfillsOptions = {}): Promise<void> {
  const wait = options.waitForBridge !== false;
  if (wait) await waitForBridge();

  const ids = options.only ?? [...DEFAULT_POLYFILL_IDS];
  for (const id of ids) {
    INSTALLERS[id]?.();
  }
}

export {
  POLYFILL_IDS,
  DEFAULT_POLYFILL_IDS,
  type InstallPolyfillsOptions,
  type PolyfillId,
} from "./types.js";
