// @generated — do not edit
/** @typedef {import('./index.d.ts').Network} NetworkApi */
import { getAurobore } from "@aurobore/core";

export const Network = {
  getStatus(args) {
    return getAurobore().invoke("Network", "getStatus", args ?? {});
  },
};
