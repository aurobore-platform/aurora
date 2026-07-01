// @generated — do not edit
/** @typedef {import('./index.d.ts').Sensors} SensorsApi */
import { getAurobore } from "@aurobore/core";

export const Sensors = {
  watchAccelerometer(args) {
    return getAurobore().invoke("Sensors", "watchAccelerometer", args ?? {}, { stream: true });
  },
  watchGyroscope(args) {
    return getAurobore().invoke("Sensors", "watchGyroscope", args ?? {}, { stream: true });
  },
};
