// @generated — do not edit
/** @typedef {import('./index.d.ts').FileSystem} FileSystemApi */
import { getAurobore } from "@aurobore/core";

export const FileSystem = {
  readText(args) {
    return getAurobore().invoke("FileSystem", "readText", args ?? {});
  },
  writeText(args) {
    return getAurobore().invoke("FileSystem", "writeText", args ?? {});
  },
  exists(args) {
    return getAurobore().invoke("FileSystem", "exists", args ?? {});
  },
  mkdir(args) {
    return getAurobore().invoke("FileSystem", "mkdir", args ?? {});
  },
  delete(args) {
    return getAurobore().invoke("FileSystem", "delete", args ?? {});
  },
  list(args) {
    return getAurobore().invoke("FileSystem", "list", args ?? {});
  },
};
