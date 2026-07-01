// @generated — do not edit
/** @typedef {import('./index.d.ts').Notifications} NotificationsApi */
import { getAurobore } from "@aurobore/core";

export const Notifications = {
  schedule(args) {
    return getAurobore().invoke("Notifications", "schedule", args ?? {});
  },
  notify(args) {
    return getAurobore().invoke("Notifications", "notify", args ?? {});
  },
  cancel(args) {
    return getAurobore().invoke("Notifications", "cancel", args ?? {});
  },
  cancelAll(args) {
    return getAurobore().invoke("Notifications", "cancelAll", args ?? {});
  },
};
