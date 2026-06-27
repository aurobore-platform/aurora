// @generated — do not edit
/** @typedef {import('./index.d.ts').Clipboard} ClipboardApi */

export const Clipboard = {
  copy(args) {
    return globalThis.Aurobore.invoke("Clipboard", "copy", args ?? {});
  },
  paste(args) {
    return globalThis.Aurobore.invoke("Clipboard", "paste", args ?? {});
  },
};
