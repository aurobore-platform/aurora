// @generated — do not edit
/** @typedef {import('./index.d.ts').Echo} EchoApi */

export const Echo = {
  ping(args) {
    return globalThis.Aurobore.invoke("Echo", "ping", args ?? {});
  },
  echo(args) {
    return globalThis.Aurobore.invoke("Echo", "echo", args ?? {});
  },
  fail(args) {
    return globalThis.Aurobore.invoke("Echo", "fail", args ?? {});
  },
  watchTicks(args) {
    return globalThis.Aurobore.invoke("Echo", "watchTicks", args ?? {}, { stream: true });
  },
};
