// @generated — do not edit
/** @typedef {import('./index.d.ts').Clipboard} ClipboardApi */
import { getAurobore } from "@aurobore/core";

export const Clipboard = {
  copy(args) {
    return getAurobore().invoke("Clipboard", "copy", args ?? {});
  },
  paste(args) {
    return getAurobore().invoke("Clipboard", "paste", args ?? {});
  },
};
