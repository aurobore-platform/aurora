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
  var BRIDGE_ERROR_CODES = {
    PROTOCOL_MISMATCH: "BRIDGE_PROTOCOL_MISMATCH",
    PLUGIN_NOT_FOUND: "BRIDGE_PLUGIN_NOT_FOUND",
    METHOD_NOT_FOUND: "BRIDGE_METHOD_NOT_FOUND",
    INVALID_ARGS: "BRIDGE_INVALID_ARGS",
    TIMEOUT: "BRIDGE_TIMEOUT",
    PERMISSION_DENIED: "BRIDGE_PERMISSION_DENIED",
    SCOPE_DENIED: "BRIDGE_SCOPE_DENIED",
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

  // ../core/dist/resource.js
  var APP_DATA_URL_PREFIX = "aurobore-app://localhost/app-data/";
  var RESOURCE_REF_KIND = "resource";
  function createResourceRef(relativePath, options) {
    const normalized = relativePath.replace(/^\/+/, "");
    return {
      kind: RESOURCE_REF_KIND,
      url: `${APP_DATA_URL_PREFIX}${normalized}`,
      ...options?.mimeType === void 0 ? {} : { mimeType: options.mimeType },
      ...options?.size === void 0 ? {} : { size: options.size }
    };
  }
  function isResourceRef(value) {
    return typeof value === "object" && value !== null && value.kind === RESOURCE_REF_KIND && typeof value.url === "string";
  }
  function resolveResourceUrl(ref, baseOrigin) {
    const url = typeof ref === "string" ? ref : ref.url;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    const origin = baseOrigin ?? (() => {
      const g = globalThis;
      return typeof g.location?.origin === "string" ? g.location.origin : "";
    })();
    if (url.startsWith("aurobore-app://localhost")) {
      const path = url.slice("aurobore-app://localhost".length) || "/";
      return origin + (path.startsWith("/") ? path : `/${path}`);
    }
    return url;
  }

  // ../core/dist/mocks/defaults.js
  var MOCK_GEO_POSITION = {
    latitude: 55.7558,
    longitude: 37.6173,
    accuracy: 12,
    altitude: 156,
    altitudeAccuracy: 5,
    heading: 90,
    speed: 0,
    timestamp: 17e11
  };
  var MOCK_DEVICE_INFO = {
    model: "Aurobore Web Mock",
    platform: "web",
    osVersion: "mock",
    locale: "en-US"
  };
  var MOCK_NETWORK_STATUS = {
    online: true,
    connectionType: "wifi"
  };
  var MOCK_SENSOR_READING = {
    x: 0.01,
    y: 0.02,
    z: 9.81,
    timestamp: 17e11
  };
  var MOCK_CLIPBOARD_TEXT = "mock clipboard";
  var MOCK_NOTIFICATION_ID = "mock-notif-1";
  var MOCK_PHOTO_FIXTURE = {
    path: "fixtures/photo.jpg",
    mimeType: "image/jpeg",
    size: 4096,
    width: 64,
    height: 64,
    format: "jpeg"
  };
  var MOCK_CAMERA_FRAME_BASE64 = "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==";

  // ../core/dist/mocks/filesystem.js
  var MockFilesystemState = class {
    constructor() {
      __publicField(this, "root", { type: "dir", children: /* @__PURE__ */ new Map() });
    }
    normalizePath(raw) {
      const trimmed = raw.replace(/^\/+/, "").replace(/\/+$/, "");
      if (!trimmed)
        return [];
      if (trimmed.includes("..")) {
        throw new Error("FILESYSTEM_INVALID_PATH");
      }
      return trimmed.split("/").filter(Boolean);
    }
    resolveDir(segments, create) {
      let current = this.root;
      for (const segment of segments) {
        if (!current.children)
          current.children = /* @__PURE__ */ new Map();
        let next = current.children.get(segment);
        if (!next) {
          if (!create)
            throw new Error("FILESYSTEM_NOT_FOUND");
          next = { type: "dir", children: /* @__PURE__ */ new Map() };
          current.children.set(segment, next);
        }
        if (next.type !== "dir")
          throw new Error("FILESYSTEM_IO_ERROR");
        current = next;
      }
      return current;
    }
    readText(path) {
      const segments = this.normalizePath(path);
      if (segments.length === 0)
        throw new Error("FILESYSTEM_INVALID_PATH");
      const fileName = segments.pop();
      const dir = this.resolveDir(segments, false);
      const entry = dir.children?.get(fileName);
      if (!entry || entry.type !== "file")
        throw new Error("FILESYSTEM_NOT_FOUND");
      return entry.content ?? "";
    }
    writeText(path, text) {
      const segments = this.normalizePath(path);
      if (segments.length === 0)
        throw new Error("FILESYSTEM_INVALID_PATH");
      const fileName = segments.pop();
      const dir = this.resolveDir(segments, true);
      if (!dir.children)
        dir.children = /* @__PURE__ */ new Map();
      dir.children.set(fileName, { type: "file", content: text });
    }
    exists(path) {
      try {
        const segments = this.normalizePath(path);
        if (segments.length === 0)
          return true;
        const fileName = segments.pop();
        const dir = this.resolveDir(segments, false);
        return dir.children?.has(fileName) ?? false;
      } catch {
        return false;
      }
    }
    mkdir(path) {
      this.resolveDir(this.normalizePath(path), true);
    }
    delete(path) {
      const segments = this.normalizePath(path);
      if (segments.length === 0)
        throw new Error("FILESYSTEM_INVALID_PATH");
      const fileName = segments.pop();
      const dir = this.resolveDir(segments, false);
      if (!dir.children?.delete(fileName))
        throw new Error("FILESYSTEM_NOT_FOUND");
    }
    list(path) {
      const dir = this.resolveDir(this.normalizePath(path), false);
      return [...dir.children?.keys() ?? []];
    }
  };

  // ../core/dist/mocks/storage.js
  var MockStorageState = class {
    constructor() {
      __publicField(this, "data", /* @__PURE__ */ new Map());
    }
    get(key) {
      return this.data.get(key);
    }
    set(key, value) {
      this.data.set(key, value);
    }
    remove(key) {
      this.data.delete(key);
    }
    keys() {
      return [...this.data.keys()];
    }
    clear() {
      this.data.clear();
    }
  };

  // ../core/dist/mocks/handlers.js
  function createMockPluginState() {
    return {
      storage: new MockStorageState(),
      filesystem: new MockFilesystemState(),
      clipboardText: MOCK_CLIPBOARD_TEXT
    };
  }
  function ok(result) {
    return { type: "ok", result };
  }
  function err(code, message, data) {
    return { type: "error", error: { code, message, ...data === void 0 ? {} : { data } } };
  }
  function notFound(method) {
    return {
      type: "error",
      error: {
        code: "BRIDGE_METHOD_NOT_FOUND",
        message: `Unknown method ${method}`
      }
    };
  }
  function fsError(code, message) {
    return err(code, message);
  }
  function dispatchMockInvoke(plugin, method, args, state) {
    const a = args ?? {};
    if (plugin === "Echo") {
      if (method === "ping")
        return ok({ pong: true });
      if (method === "echo")
        return ok(args);
      if (method === "fail") {
        return err("ECHO_TEST_ERROR", "demo error", { code: 42 });
      }
      if (method === "watchTicks") {
        return {
          type: "stream",
          stream: {
            count: 5,
            intervalMs: 10,
            payload: (tick) => ({ tick })
          }
        };
      }
      if (method === "watchFastTicks") {
        return {
          type: "stream",
          stream: {
            count: 100,
            intervalMs: 0,
            payload: (tick) => ({ tick })
          }
        };
      }
      if (method === "getSampleResource") {
        return ok({
          kind: "resource",
          url: `${APP_DATA_URL_PREFIX}echo/sample.txt`,
          mimeType: "text/plain",
          size: 28
        });
      }
      return notFound(method);
    }
    if (plugin === "Cover") {
      if (method === "setState" || method === "setActions" || method === "reset") {
        return ok({ ok: true });
      }
      return notFound(method);
    }
    if (plugin === "Device") {
      if (method === "getInfo") {
        const locale = typeof globalThis.navigator !== "undefined" && globalThis.navigator.language ? globalThis.navigator.language : MOCK_DEVICE_INFO.locale;
        return ok({ ...MOCK_DEVICE_INFO, locale });
      }
      return notFound(method);
    }
    if (plugin === "Storage") {
      if (method === "get") {
        const key = a.key;
        if (!key)
          return err("STORAGE_INVALID_ARGS", "key required");
        const value = state.storage.get(key);
        return ok({ value: value ?? "" });
      }
      if (method === "set") {
        const key = a.key;
        if (!key)
          return err("STORAGE_INVALID_ARGS", "key required");
        state.storage.set(key, String(a.value ?? ""));
        return ok(void 0);
      }
      if (method === "remove") {
        const key = a.key;
        if (!key)
          return err("STORAGE_INVALID_ARGS", "key required");
        state.storage.remove(key);
        return ok(void 0);
      }
      if (method === "keys")
        return ok({ keys: state.storage.keys() });
      if (method === "clear") {
        state.storage.clear();
        return ok(void 0);
      }
      return notFound(method);
    }
    if (plugin === "FileSystem") {
      const path = a.path;
      try {
        if (method === "readText") {
          if (!path)
            return fsError("FILESYSTEM_INVALID_PATH", "Invalid or blocked path");
          return ok({ text: state.filesystem.readText(path) });
        }
        if (method === "writeText") {
          if (!path)
            return fsError("FILESYSTEM_INVALID_PATH", "Invalid or blocked path");
          state.filesystem.writeText(path, String(a.text ?? ""));
          return ok(void 0);
        }
        if (method === "exists") {
          if (!path)
            return fsError("FILESYSTEM_INVALID_PATH", "Invalid or blocked path");
          return ok({ exists: state.filesystem.exists(path) });
        }
        if (method === "mkdir") {
          if (!path)
            return fsError("FILESYSTEM_INVALID_PATH", "Invalid or blocked path");
          state.filesystem.mkdir(path);
          return ok(void 0);
        }
        if (method === "delete") {
          if (!path)
            return fsError("FILESYSTEM_INVALID_PATH", "Invalid or blocked path");
          state.filesystem.delete(path);
          return ok(void 0);
        }
        if (method === "list") {
          const listPath = path ?? "";
          return ok({ entries: state.filesystem.list(listPath) });
        }
      } catch (e) {
        const code = e instanceof Error ? e.message : "FILESYSTEM_IO_ERROR";
        const messages = {
          FILESYSTEM_INVALID_PATH: "Invalid or blocked path",
          FILESYSTEM_NOT_FOUND: "File or directory not found",
          FILESYSTEM_IO_ERROR: "Filesystem I/O error"
        };
        return fsError(code, messages[code] ?? "Filesystem I/O error");
      }
      return notFound(method);
    }
    if (plugin === "Clipboard") {
      if (method === "copy") {
        state.clipboardText = String(a.text ?? "");
        return ok(void 0);
      }
      if (method === "paste")
        return ok({ text: state.clipboardText });
      return notFound(method);
    }
    if (plugin === "Network") {
      if (method === "getStatus") {
        const nav = globalThis.navigator;
        const online = nav?.onLine ?? MOCK_NETWORK_STATUS.online;
        return ok({ online, connectionType: MOCK_NETWORK_STATUS.connectionType });
      }
      return notFound(method);
    }
    if (plugin === "Camera") {
      if (method === "getPhoto" || method === "pickPhoto") {
        const ref = createResourceRef(MOCK_PHOTO_FIXTURE.path, {
          mimeType: MOCK_PHOTO_FIXTURE.mimeType,
          size: MOCK_PHOTO_FIXTURE.size
        });
        return ok({
          kind: "string",
          url: ref.url,
          mimeType: MOCK_PHOTO_FIXTURE.mimeType,
          size: MOCK_PHOTO_FIXTURE.size,
          width: MOCK_PHOTO_FIXTURE.width,
          height: MOCK_PHOTO_FIXTURE.height,
          format: MOCK_PHOTO_FIXTURE.format
        });
      }
      if (method === "watchPreview") {
        return {
          type: "stream",
          stream: {
            count: 30,
            intervalMs: 66,
            payload: () => ({
              kind: "frame",
              format: "jpeg",
              width: MOCK_PHOTO_FIXTURE.width,
              height: MOCK_PHOTO_FIXTURE.height,
              timestamp: Date.now(),
              binaryPayload: MOCK_CAMERA_FRAME_BASE64
            })
          }
        };
      }
      return notFound(method);
    }
    if (plugin === "Geolocation") {
      if (method === "getCurrentPosition") {
        return ok({ ...MOCK_GEO_POSITION, timestamp: Date.now() });
      }
      if (method === "watch") {
        return {
          type: "stream",
          stream: {
            count: 5,
            intervalMs: 500,
            payload: (tick) => ({
              ...MOCK_GEO_POSITION,
              accuracy: MOCK_GEO_POSITION.accuracy + tick,
              timestamp: Date.now()
            })
          }
        };
      }
      if (method === "clearWatch")
        return ok(void 0);
      return notFound(method);
    }
    if (plugin === "Sensors") {
      if (method === "watchAccelerometer" || method === "watchGyroscope") {
        return {
          type: "stream",
          stream: {
            count: 10,
            intervalMs: 100,
            payload: (tick) => ({
              ...MOCK_SENSOR_READING,
              x: MOCK_SENSOR_READING.x + tick * 1e-3,
              timestamp: Date.now()
            })
          }
        };
      }
      return notFound(method);
    }
    if (plugin === "Notifications") {
      if (method === "schedule" || method === "notify") {
        return ok({ id: MOCK_NOTIFICATION_ID });
      }
      if (method === "cancel" || method === "cancelAll")
        return ok(void 0);
      return notFound(method);
    }
    if (plugin === "Share") {
      if (method === "shareText" || method === "shareUrl" || method === "shareFile") {
        return ok(void 0);
      }
      return notFound(method);
    }
    return {
      type: "error",
      error: {
        code: "BRIDGE_METHOD_NOT_FOUND",
        message: `Unknown plugin ${plugin}`
      }
    };
  }
  function dispatchMockEvent(name, data, sendEvent) {
    if (name === "app:demo") {
      sendEvent("app:echo", data);
    }
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
  function scheduleStreamFlush(streams, subscriptionId) {
    const stream = streams.get(subscriptionId);
    if (!stream || stream.flushScheduled) return;
    stream.flushScheduled = true;
    const flush = () => {
      const current = streams.get(subscriptionId);
      if (!current) return;
      current.flushScheduled = false;
      if (current.hasPending) {
        current.onData(current.pendingPayload);
        current.hasPending = false;
        current.pendingPayload = void 0;
      }
    };
    const g = globalThis;
    if (typeof g.requestAnimationFrame === "function") {
      g.requestAnimationFrame(flush);
    } else {
      setTimeout(flush, 0);
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
    /** Одноразовая подписка на событие. */
    once(name, handler) {
      const wrapped = (data) => {
        this.off(name, wrapped);
        handler(data);
      };
      return this.on(name, wrapped);
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
      const meta = { stream: true };
      if (options.maxFps !== void 0) meta.maxFps = options.maxFps;
      const msg = createInvoke(plugin, method, args, meta);
      const subscriptionId = msg.id;
      const coalesce = options.streamCoalesce !== false;
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
        onComplete: () => sub.onComplete(),
        coalesce,
        hasPending: false,
        flushScheduled: false
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
          if (stream.coalesce) {
            stream.pendingPayload = msg.payload;
            stream.hasPending = true;
            scheduleStreamFlush(this.streams, msg.subscriptionId);
          } else {
            stream.onData(msg.payload);
          }
        } else if (msg.phase === "error") {
          if (stream.hasPending) {
            stream.hasPending = false;
            stream.pendingPayload = void 0;
          }
          stream.onError(msg.error ?? createBridgeError("BRIDGE_STREAM_ERROR", "Stream error"));
          this.streams.delete(msg.subscriptionId);
        } else if (msg.phase === "complete") {
          if (stream.hasPending) {
            stream.onData(stream.pendingPayload);
            stream.hasPending = false;
            stream.pendingPayload = void 0;
          }
          stream.onComplete();
          this.streams.delete(msg.subscriptionId);
        }
      }
    }
    dispatchEvent(name, data) {
      this.emitToHandlers(name, data);
      if (name === "deeplink") {
        this.emitToHandlers("appurlopen", data);
      }
    }
    emitToHandlers(name, data) {
      for (const handler of this.eventHandlers.get(name) ?? []) {
        try {
          handler(data);
        } catch (e) {
          console.error("[aurobore-bridge] event handler error:", e);
        }
      }
    }
  };

  // src/mock-host.ts
  var MockNativeHost = class {
    constructor(transport, state) {
      this.transport = transport;
      __publicField(this, "state");
      __publicField(this, "activeStreamId", null);
      __publicField(this, "streamTimeoutId", null);
      this.state = state ?? createMockPluginState();
      transport.onReceiveRaw((msg) => this.handleMessage(msg));
    }
    handleMessage(msg) {
      if (msg.type === "cancel") {
        if (this.activeStreamId === msg.id) {
          if (this.streamTimeoutId !== null) {
            clearTimeout(this.streamTimeoutId);
            this.streamTimeoutId = null;
          }
          this.activeStreamId = null;
        }
        return;
      }
      if (msg.type === "invoke") {
        const { id, plugin, method, args } = msg;
        const result = dispatchMockInvoke(plugin, method, args, this.state);
        if (result.type === "ok") {
          this.reply(id, true, result.result);
        } else if (result.type === "error") {
          this.reply(id, false, result.error);
        } else if (result.type === "stream") {
          this.runStream(id, result.stream);
        } else {
          this.reply(id, false, {
            code: "BRIDGE_METHOD_NOT_FOUND",
            message: `Unknown method ${method}`
          });
        }
        return;
      }
      if (msg.type === "event") {
        dispatchMockEvent(msg.name, msg.data, (name, data) => {
          this.transport.sendRaw({ type: "event", name, data });
        });
      }
    }
    reply(id, ok2, payload) {
      if (ok2) {
        this.transport.sendRaw({ type: "response", id, ok: true, result: payload });
      } else {
        this.transport.sendRaw({
          type: "response",
          id,
          ok: false,
          error: payload
        });
      }
    }
    runStream(subscriptionId, spec) {
      this.activeStreamId = subscriptionId;
      let tick = 0;
      const sendComplete = () => {
        this.streamTimeoutId = null;
        this.activeStreamId = null;
        this.transport.sendRaw({
          type: "stream",
          subscriptionId,
          phase: "complete"
        });
      };
      const sendTick = () => {
        tick += 1;
        if (tick <= spec.count) {
          this.transport.sendRaw({
            type: "stream",
            subscriptionId,
            phase: "data",
            payload: spec.payload(tick)
          });
          if (tick < spec.count) {
            if (spec.intervalMs <= 0) {
              sendTick();
            } else {
              this.streamTimeoutId = setTimeout(sendTick, spec.intervalMs);
            }
          } else {
            sendComplete();
          }
        }
      };
      if (spec.intervalMs <= 0) {
        queueMicrotask(() => {
          for (let i = 1; i <= spec.count; i += 1) {
            this.transport.sendRaw({
              type: "stream",
              subscriptionId,
              phase: "data",
              payload: spec.payload(i)
            });
          }
          this.activeStreamId = null;
          this.transport.sendRaw({
            type: "stream",
            subscriptionId,
            phase: "complete"
          });
        });
      } else {
        sendTick();
      }
    }
  };

  // src/transport/loopback.ts
  var LoopbackTransport = class _LoopbackTransport {
    constructor() {
      __publicField(this, "handlers", /* @__PURE__ */ new Set());
      __publicField(this, "rawHandlers", /* @__PURE__ */ new Set());
      __publicField(this, "peer", null);
    }
    static pair() {
      const a = new _LoopbackTransport();
      const b = new _LoopbackTransport();
      a.peer = b;
      b.peer = a;
      return [a, b];
    }
    send(message) {
      this.sendRaw(message);
    }
    sendRaw(message) {
      if (!this.peer) return;
      queueMicrotask(() => {
        for (const handler of this.peer.handlers) {
          handler(message);
        }
        for (const handler of this.peer.rawHandlers) {
          handler(message);
        }
      });
    }
    onReceive(handler) {
      this.handlers.add(handler);
      return () => {
        this.handlers.delete(handler);
      };
    }
    onReceiveRaw(handler) {
      this.rawHandlers.add(handler);
      return () => {
        this.rawHandlers.delete(handler);
      };
    }
  };

  // src/bundle-web.ts
  var [jsSide, nativeSide] = LoopbackTransport.pair();
  new MockNativeHost(nativeSide);
  var bridge = new Bridge(jsSide);
  window.__auroboreBridgeEmit = (name, data) => {
    nativeSide.sendRaw({ type: "event", name, data });
  };
  window.Aurobore = {
    invoke: (plugin, method, args, options) => bridge.invoke(plugin, method, args, options),
    on: (name, handler) => bridge.on(name, handler),
    off: (name, handler) => bridge.off(name, handler),
    once: (name, handler) => bridge.once(name, handler),
    emit: (name, data) => bridge.emit(name, data),
    resolveResourceUrl,
    isResourceRef,
    __protocolVersion: BRIDGE_PROTOCOL_VERSION
  };
  console.log("[aurobore-bridge] browser mock mode initialized");
})();
