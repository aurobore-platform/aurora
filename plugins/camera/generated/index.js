// @generated — do not edit
/** @typedef {import('./index.d.ts').Camera} CameraApi */
import { getAurobore } from "@aurobore/core";

export const Camera = {
  getPhoto(args) {
    return getAurobore().invoke("Camera", "getPhoto", args ?? {});
  },
  pickPhoto(args) {
    return getAurobore().invoke("Camera", "pickPhoto", args ?? {});
  },
  watchPreview(args) {
    return getAurobore().invoke("Camera", "watchPreview", args ?? {}, { stream: true });
  },
};
