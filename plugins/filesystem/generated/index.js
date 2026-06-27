// @generated — do not edit
/** @typedef {import('./index.d.ts').FileSystem} FileSystemApi */

export const FileSystem = {
  readText(args) {
    return globalThis.Aurobore.invoke("FileSystem", "readText", args ?? {});
  },
  writeText(args) {
    return globalThis.Aurobore.invoke("FileSystem", "writeText", args ?? {});
  },
  exists(args) {
    return globalThis.Aurobore.invoke("FileSystem", "exists", args ?? {});
  },
  mkdir(args) {
    return globalThis.Aurobore.invoke("FileSystem", "mkdir", args ?? {});
  },
  delete(args) {
    return globalThis.Aurobore.invoke("FileSystem", "delete", args ?? {});
  },
  list(args) {
    return globalThis.Aurobore.invoke("FileSystem", "list", args ?? {});
  },
};
