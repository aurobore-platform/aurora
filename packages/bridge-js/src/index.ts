/**
 * @aurobore/bridge-js — низкоуровневая JS-сторона моста (M2).
 */
export { BRIDGE_PROTOCOL_VERSION, createInvoke, nextCallId, resetCallIdCounter } from "./messages.js";
export { Bridge, type InvokeOptions, type StreamSubscription } from "./bridge.js";
export type { BridgeTransport } from "./transport/types.js";
export { MockNativeHost } from "./mock-host.js";
export { LoopbackNativeStub, LoopbackTransport } from "./transport/loopback.js";
export { WebViewTransport } from "./transport/webview.js";
