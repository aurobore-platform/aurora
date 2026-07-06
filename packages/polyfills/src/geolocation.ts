import { getAurobore } from "@aurobore/core";
import type { StreamSubscription } from "@aurobore/core";
import { toPositionError } from "./errors.js";
import type { PluginPosition } from "./types.js";

function toGeolocationPosition(pos: PluginPosition): GeolocationPosition {
  const coords: GeolocationCoordinates = {
    latitude: pos.latitude,
    longitude: pos.longitude,
    accuracy: pos.accuracy ?? 0,
    altitude: pos.altitude ?? null,
    altitudeAccuracy: pos.altitudeAccuracy ?? null,
    heading: pos.heading ?? null,
    speed: pos.speed ?? null,
    toJSON() {
      return {
        latitude: this.latitude,
        longitude: this.longitude,
        accuracy: this.accuracy,
        altitude: this.altitude,
        altitudeAccuracy: this.altitudeAccuracy,
        heading: this.heading,
        speed: this.speed,
      };
    },
  };
  return {
    coords,
    timestamp: pos.timestamp,
    toJSON() {
      return { coords: this.coords.toJSON(), timestamp: this.timestamp };
    },
  };
}

type WatchEntry = {
  subscription: StreamSubscription;
  success: PositionCallback;
  error?: PositionErrorCallback | null;
};

let nextWatchId = 1;
const watches = new Map<number, WatchEntry>();

export function installGeolocationPolyfill(): void {
  const nav = navigator as Navigator & { geolocation?: Geolocation };
  if (nav.geolocation && typeof nav.geolocation.getCurrentPosition === "function") {
    return;
  }

  const geolocation: Geolocation = {
    getCurrentPosition(success, error, options) {
      getAurobore()
        .invoke("Geolocation", "getCurrentPosition", {
          enableHighAccuracy: options?.enableHighAccuracy,
          timeout: options?.timeout,
          maximumAge: options?.maximumAge,
        })
        .then((result) => success(toGeolocationPosition(result as PluginPosition)))
        .catch((e) => error?.(toPositionError(e)));
    },

    watchPosition(success, error, options) {
      const watchId = nextWatchId++;
      getAurobore()
        .invoke(
          "Geolocation",
          "watch",
          {
            enableHighAccuracy: options?.enableHighAccuracy,
            timeout: options?.timeout,
            maximumAge: options?.maximumAge,
          },
          { stream: true },
        )
        .then((sub) => {
          const subscription = sub as StreamSubscription;
          subscription.onData = (payload) => {
            success(toGeolocationPosition(payload as PluginPosition));
          };
          subscription.onError = (bridgeErr) => {
            error?.({
              code: 2,
              message: bridgeErr.message,
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            });
          };
          subscription.onComplete = () => {
            watches.delete(watchId);
          };
          watches.set(watchId, { subscription, success, error });
        })
        .catch((e) => error?.(toPositionError(e)));
      return watchId;
    },

    clearWatch(watchId) {
      const entry = watches.get(watchId);
      if (!entry) return;
      entry.subscription.stop();
      watches.delete(watchId);
      getAurobore()
        .invoke("Geolocation", "clearWatch", { watchId: entry.subscription.subscriptionId })
        .catch(() => {});
    },
  };

  Object.defineProperty(nav, "geolocation", {
    value: geolocation,
    configurable: true,
    writable: true,
  });
}
