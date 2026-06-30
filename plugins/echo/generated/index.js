// @generated — do not edit
/** @typedef {import('./index.d.ts').Echo} EchoApi */
import { getAurobore } from "@aurobore/core";

export const Echo = {
  ping(args) {
    return getAurobore().invoke("Echo", "ping", args ?? {});
  },
  echo(args) {
    return getAurobore().invoke("Echo", "echo", args ?? {});
  },
  fail(args) {
    return getAurobore().invoke("Echo", "fail", args ?? {});
  },
  watchTicks(args) {
    return getAurobore().invoke("Echo", "watchTicks", args ?? {}, { stream: true });
  },
  watchFastTicks(args) {
    return getAurobore().invoke("Echo", "watchFastTicks", args ?? {}, { stream: true });
  },
  getSampleResource(args) {
    return getAurobore().invoke("Echo", "getSampleResource", args ?? {});
  },
};
