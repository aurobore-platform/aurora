// @generated — do not edit
/** @typedef {import('./index.d.ts').Device} DeviceApi */

export const Device = {
  getInfo(args) {
    return globalThis.Aurobore.invoke("Device", "getInfo", args ?? {});
  },
};
