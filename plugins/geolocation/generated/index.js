// @generated — do not edit
/** @typedef {import('./index.d.ts').Geolocation} GeolocationApi */
import { getAurobore } from "@aurobore/core";

export const Geolocation = {
  getCurrentPosition(args) {
    return getAurobore().invoke("Geolocation", "getCurrentPosition", args ?? {});
  },
  watch(args) {
    return getAurobore().invoke("Geolocation", "watch", args ?? {}, { stream: true });
  },
  clearWatch(args) {
    return getAurobore().invoke("Geolocation", "clearWatch", args ?? {});
  },
};
