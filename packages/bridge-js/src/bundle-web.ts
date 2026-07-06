/**
 * IIFE-бандл для browser mock mode: loopback transport + mock native host.
 */
import { BRIDGE_PROTOCOL_VERSION, isResourceRef, resolveResourceUrl } from "@aurobore/core";
import { Bridge } from "./bridge.js";
import { MockNativeHost } from "./mock-host.js";
import { LoopbackTransport } from "./transport/loopback.js";

const [jsSide, nativeSide] = LoopbackTransport.pair();
new MockNativeHost(nativeSide);
const bridge = new Bridge(jsSide);

/** Native→JS lifecycle events for aurobore-web-shim.js */
(
  window as unknown as { __auroboreBridgeEmit?: (name: string, data?: unknown) => void }
).__auroboreBridgeEmit = (name, data) => {
  nativeSide.sendRaw({ type: "event", name, data });
};

declare global {
  interface Window {
    Aurobore: {
      invoke: Bridge["invoke"];
      on: Bridge["on"];
      off: Bridge["off"];
      once: Bridge["once"];
      emit: Bridge["emit"];
      resolveResourceUrl: typeof resolveResourceUrl;
      isResourceRef: typeof isResourceRef;
      __protocolVersion: number;
    };
  }
}

window.Aurobore = {
  invoke: (plugin, method, args, options) => bridge.invoke(plugin, method, args, options),
  on: (name, handler) => bridge.on(name, handler),
  off: (name, handler) => bridge.off(name, handler),
  once: (name, handler) => bridge.once(name, handler),
  emit: (name, data) => bridge.emit(name, data),
  resolveResourceUrl,
  isResourceRef,
  __protocolVersion: BRIDGE_PROTOCOL_VERSION,
};

console.log("[aurobore-bridge] browser mock mode initialized");
