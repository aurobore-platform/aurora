"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // ../core/dist/types.js
  var BRIDGE_PROTOCOL_VERSION = 1;
  function createBridgeError(code, message, data) {
    return { code, message, ...data === void 0 ? {} : { data } };
  }

  // ../core/dist/protocol.js
  var BRIDGE_CHANNEL = "aurobore:bridge";
  var BRIDGE_ERROR_CODES = {
    PROTOCOL_MISMATCH: "BRIDGE_PROTOCOL_MISMATCH",
    PLUGIN_NOT_FOUND: "BRIDGE_PLUGIN_NOT_FOUND",
    METHOD_NOT_FOUND: "BRIDGE_METHOD_NOT_FOUND",
    INVALID_ARGS: "BRIDGE_INVALID_ARGS",
    TIMEOUT: "BRIDGE_TIMEOUT",
    PERMISSION_DENIED: "BRIDGE_PERMISSION_DENIED",
    CANCELLED: "BRIDGE_CANCELLED"
  };
  function createCancel(id) {
    return { type: "cancel", id };
  }
  function isResponseMessage(value) {
    return typeof value === "object" && value !== null && value.type === "response";
  }
  function isEventMessage(value) {
    return typeof value === "object" && value !== null && value.type === "event";
  }
  function isStreamMessage(value) {
    return typeof value === "object" && value !== null && value.type === "stream";
  }

  // src/messages.ts
  var counter = 0;
  function nextCallId() {
    counter += 1;
    return `c-${counter}`;
  }
  function createInvoke(plugin, method, args, meta) {
    return {
      type: "invoke",
      protocol: BRIDGE_PROTOCOL_VERSION,
      id: nextCallId(),
      plugin,
      method,
      ...args === void 0 ? {} : { args },
      ...meta === void 0 ? {} : { meta }
    };
  }

  // src/bridge.ts
  var DEFAULT_TIMEOUT_MS = 3e4;
  function assertJsonSerializable(value) {
    try {
      JSON.stringify(value);
    } catch {
      throw createBridgeError(BRIDGE_ERROR_CODES.INVALID_ARGS, "Arguments are not JSON-serializable");
    }
  }
  var Bridge = class {
    constructor(transport) {
      this.transport = transport;
      __publicField(this, "pending", /* @__PURE__ */ new Map());
      __publicField(this, "streams", /* @__PURE__ */ new Map());
      __publicField(this, "eventHandlers", /* @__PURE__ */ new Map());
      __publicField(this, "transportUnsub");
      this.transportUnsub = transport.onReceive((msg) => this.handleInbound(msg));
    }
    /** Вызов нативного метода плагина → Promise. */
    invoke(plugin, method, args, options) {
      try {
        assertJsonSerializable(args ?? null);
      } catch (error) {
        return Promise.reject(error);
      }
      if (options?.stream) {
        return this.invokeStream(plugin, method, args, options);
      }
      const msg = createInvoke(plugin, method, args, { stream: false });
      const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      return new Promise((resolve, reject) => {
        const entry = { resolve, reject };
        if (options?.signal) {
          if (options.signal.aborted) {
            reject(createBridgeError(BRIDGE_ERROR_CODES.CANCELLED, "Invoke cancelled"));
            return;
          }
          const onAbort = () => {
            this.pending.delete(msg.id);
            if (entry.timeoutId) clearTimeout(entry.timeoutId);
            this.transport.send(createCancel(msg.id));
            reject(createBridgeError(BRIDGE_ERROR_CODES.CANCELLED, "Invoke cancelled"));
          };
          entry.abortHandler = onAbort;
          options.signal.addEventListener("abort", onAbort, { once: true });
        }
        entry.timeoutId = setTimeout(() => {
          this.pending.delete(msg.id);
          reject(createBridgeError(BRIDGE_ERROR_CODES.TIMEOUT, `Invoke timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        this.pending.set(msg.id, entry);
        this.transport.send(msg);
      });
    }
    /** Подписка на событие (native→JS или JS→native echo). */
    on(name, handler) {
      if (!this.eventHandlers.has(name)) {
        this.eventHandlers.set(name, /* @__PURE__ */ new Set());
      }
      this.eventHandlers.get(name).add(handler);
      return () => {
        this.off(name, handler);
      };
    }
    off(name, handler) {
      this.eventHandlers.get(name)?.delete(handler);
    }
    /** Эмит события JS→native. */
    emit(name, data) {
      try {
        assertJsonSerializable(data ?? null);
      } catch (error) {
        console.error("[aurobore-bridge] emit failed:", error);
        return;
      }
      this.transport.send({ type: "event", name, ...data === void 0 ? {} : { data } });
    }
    destroy() {
      this.transportUnsub();
      for (const [, entry] of this.pending) {
        if (entry.timeoutId) clearTimeout(entry.timeoutId);
      }
      this.pending.clear();
      this.streams.clear();
      this.eventHandlers.clear();
    }
    invokeStream(plugin, method, args, options) {
      const msg = createInvoke(plugin, method, args, { stream: true });
      const subscriptionId = msg.id;
      const sub = {
        subscriptionId,
        onData: () => {
        },
        onError: () => {
        },
        onComplete: () => {
        },
        stop: () => {
        }
      };
      this.streams.set(subscriptionId, {
        onData: (payload) => sub.onData(payload),
        onError: (error) => sub.onError(error),
        onComplete: () => sub.onComplete()
      });
      const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const timeoutId = setTimeout(() => {
        if (this.streams.has(subscriptionId)) {
          this.streams.delete(subscriptionId);
          sub.onError(
            createBridgeError(BRIDGE_ERROR_CODES.TIMEOUT, `Stream timed out after ${timeoutMs}ms`)
          );
        }
      }, timeoutMs);
      const originalOnComplete = sub.onComplete;
      sub.onComplete = () => {
        clearTimeout(timeoutId);
        originalOnComplete();
      };
      const cleanupStream = () => {
        this.streams.delete(subscriptionId);
        clearTimeout(timeoutId);
        this.transport.send(createCancel(subscriptionId));
      };
      sub.stop = () => {
        cleanupStream();
      };
      if (options?.signal) {
        if (options.signal.aborted) {
          cleanupStream();
          return Promise.reject(createBridgeError(BRIDGE_ERROR_CODES.CANCELLED, "Invoke cancelled"));
        }
        options.signal.addEventListener(
          "abort",
          () => {
            cleanupStream();
            sub.onError(createBridgeError(BRIDGE_ERROR_CODES.CANCELLED, "Invoke cancelled"));
          },
          { once: true }
        );
      }
      this.transport.send(msg);
      return Promise.resolve(sub);
    }
    handleInbound(msg) {
      if (isResponseMessage(msg)) {
        const entry = this.pending.get(msg.id);
        if (!entry) return;
        this.pending.delete(msg.id);
        if (entry.timeoutId) clearTimeout(entry.timeoutId);
        if (entry.abortHandler && msg.ok) {
        }
        if (msg.ok) {
          entry.resolve(msg.result);
        } else {
          entry.reject(msg.error ?? createBridgeError("BRIDGE_UNKNOWN", "Unknown bridge error"));
        }
        return;
      }
      if (isEventMessage(msg)) {
        this.dispatchEvent(msg.name, msg.data);
        return;
      }
      if (isStreamMessage(msg)) {
        const stream = this.streams.get(msg.subscriptionId);
        if (!stream) return;
        if (msg.phase === "data") {
          stream.onData(msg.payload);
        } else if (msg.phase === "error") {
          stream.onError(msg.error ?? createBridgeError("BRIDGE_STREAM_ERROR", "Stream error"));
          this.streams.delete(msg.subscriptionId);
        } else if (msg.phase === "complete") {
          stream.onComplete();
          this.streams.delete(msg.subscriptionId);
        }
      }
    }
    dispatchEvent(name, data) {
      for (const handler of this.eventHandlers.get(name) ?? []) {
        try {
          handler(data);
        } catch (e) {
          console.error("[aurobore-bridge] event handler error:", e);
        }
      }
    }
  };

  // src/transport/webview.ts
  var WebViewTransport = class {
    constructor() {
      __publicField(this, "handlers", /* @__PURE__ */ new Set());
      globalThis.__auroboreBridgeReceive = (msg) => {
        for (const handler of this.handlers) {
          handler(msg);
        }
      };
    }
    send(message) {
      if (typeof globalThis.sendAsyncMessage !== "function") {
        console.warn("[aurobore-bridge] sendAsyncMessage unavailable");
        return;
      }
      globalThis.sendAsyncMessage(BRIDGE_CHANNEL, JSON.stringify(message));
    }
    onReceive(handler) {
      this.handlers.add(handler);
      return () => {
        this.handlers.delete(handler);
      };
    }
  };

  // src/bundle.ts
  var bridge = new Bridge(new WebViewTransport());
  window.Aurobore = {
    invoke: (plugin, method, args, options) => bridge.invoke(plugin, method, args, options),
    on: (name, handler) => bridge.on(name, handler),
    off: (name, handler) => bridge.off(name, handler),
    emit: (name, data) => bridge.emit(name, data)
  };
  console.log("[aurobore-bridge] M2 bridge initialized");
})();
