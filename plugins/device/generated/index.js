// @generated — do not edit
/** @typedef {import('./index.d.ts').Device} DeviceApi */
import { getAurobore } from "@aurobore/core";

export const Device = {
  getInfo(args) {
    return getAurobore().invoke("Device", "getInfo", args ?? {});
  },
};
