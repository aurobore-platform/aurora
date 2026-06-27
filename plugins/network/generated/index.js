// @generated — do not edit
/** @typedef {import('./index.d.ts').Network} NetworkApi */

export const Network = {
  getStatus(args) {
    return globalThis.Aurobore.invoke("Network", "getStatus", args ?? {});
  },
};
