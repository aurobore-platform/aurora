/**
 * IIFE-бандл для runtime/container: window.Aurobore = { invoke, on, emit, off }.
 */
import { Bridge } from "./bridge.js";
import { WebViewTransport } from "./transport/webview.js";

const bridge = new Bridge(new WebViewTransport());

declare global {
  interface Window {
    Aurobore: {
      invoke: Bridge["invoke"];
      on: Bridge["on"];
      off: Bridge["off"];
      emit: Bridge["emit"];
    };
  }
}

window.Aurobore = {
  invoke: (plugin, method, args, options) => bridge.invoke(plugin, method, args, options),
  on: (name, handler) => bridge.on(name, handler),
  off: (name, handler) => bridge.off(name, handler),
  emit: (name, data) => bridge.emit(name, data),
};

console.log("[aurobore-bridge] M2 bridge initialized");
