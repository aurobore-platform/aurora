/**
 * IIFE-бандл для runtime/container: window.Aurobore = { invoke, on, emit, off }.
 */
import { BRIDGE_PROTOCOL_VERSION, isResourceRef, resolveResourceUrl } from "@aurobore/core";
import { Bridge } from "./bridge.js";
import { WebViewTransport } from "./transport/webview.js";

const bridge = new Bridge(new WebViewTransport());

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

console.log("[aurobore-bridge] M2 bridge initialized");
