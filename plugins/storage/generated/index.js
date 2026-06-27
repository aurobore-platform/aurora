// @generated — do not edit
/** @typedef {import('./index.d.ts').Storage} StorageApi */

export const Storage = {
  get(args) {
    return globalThis.Aurobore.invoke("Storage", "get", args ?? {});
  },
  set(args) {
    return globalThis.Aurobore.invoke("Storage", "set", args ?? {});
  },
  remove(args) {
    return globalThis.Aurobore.invoke("Storage", "remove", args ?? {});
  },
  keys(args) {
    return globalThis.Aurobore.invoke("Storage", "keys", args ?? {});
  },
  clear(args) {
    return globalThis.Aurobore.invoke("Storage", "clear", args ?? {});
  },
};
