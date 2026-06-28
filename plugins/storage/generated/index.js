// @generated — do not edit
/** @typedef {import('./index.d.ts').Storage} StorageApi */
import { getAurobore } from "@aurobore/core";

export const Storage = {
  get(args) {
    return getAurobore().invoke("Storage", "get", args ?? {});
  },
  set(args) {
    return getAurobore().invoke("Storage", "set", args ?? {});
  },
  remove(args) {
    return getAurobore().invoke("Storage", "remove", args ?? {});
  },
  keys(args) {
    return getAurobore().invoke("Storage", "keys", args ?? {});
  },
  clear(args) {
    return getAurobore().invoke("Storage", "clear", args ?? {});
  },
};
