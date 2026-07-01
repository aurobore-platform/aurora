// @generated — do not edit
/** @typedef {import('./index.d.ts').Share} ShareApi */
import { getAurobore } from "@aurobore/core";

export const Share = {
  shareText(args) {
    return getAurobore().invoke("Share", "shareText", args ?? {});
  },
  shareUrl(args) {
    return getAurobore().invoke("Share", "shareUrl", args ?? {});
  },
  shareFile(args) {
    return getAurobore().invoke("Share", "shareFile", args ?? {});
  },
};
