"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

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

  // ../core/dist/errors.js
  var AuroboreError = class extends Error {
    constructor(code, message, data) {
      super(message);
      __publicField(this, "code");
      __publicField(this, "data");
      this.name = "AuroboreError";
      this.code = code;
      if (data !== void 0)
        this.data = data;
    }
    static fromBridgeError(err) {
      return wrapBridgeError(err);
    }
  };
  var PermissionDeniedError = class extends AuroboreError {
    constructor(message, data) {
      super(BRIDGE_ERROR_CODES.PERMISSION_DENIED, message, data);
      this.name = "PermissionDeniedError";
    }
  };
  var TimeoutError = class extends AuroboreError {
    constructor(message, data) {
      super(BRIDGE_ERROR_CODES.TIMEOUT, message, data);
      this.name = "TimeoutError";
    }
  };
  var CancelledError = class extends AuroboreError {
    constructor(message, data) {
      super(BRIDGE_ERROR_CODES.CANCELLED, message, data);
      this.name = "CancelledError";
    }
  };
  var PluginNotFoundError = class extends AuroboreError {
    constructor(message, data) {
      super(BRIDGE_ERROR_CODES.PLUGIN_NOT_FOUND, message, data);
      this.name = "PluginNotFoundError";
    }
  };
  var MethodNotFoundError = class extends AuroboreError {
    constructor(message, data) {
      super(BRIDGE_ERROR_CODES.METHOD_NOT_FOUND, message, data);
      this.name = "MethodNotFoundError";
    }
  };
  var InvalidArgsError = class extends AuroboreError {
    constructor(message, data) {
      super(BRIDGE_ERROR_CODES.INVALID_ARGS, message, data);
      this.name = "InvalidArgsError";
    }
  };
  var ProtocolMismatchError = class extends AuroboreError {
    constructor(message, data) {
      super(BRIDGE_ERROR_CODES.PROTOCOL_MISMATCH, message, data);
      this.name = "ProtocolMismatchError";
    }
  };
  function wrapBridgeError(err) {
    switch (err.code) {
      case BRIDGE_ERROR_CODES.PERMISSION_DENIED:
        return new PermissionDeniedError(err.message, err.data);
      case BRIDGE_ERROR_CODES.TIMEOUT:
        return new TimeoutError(err.message, err.data);
      case BRIDGE_ERROR_CODES.CANCELLED:
        return new CancelledError(err.message, err.data);
      case BRIDGE_ERROR_CODES.PLUGIN_NOT_FOUND:
        return new PluginNotFoundError(err.message, err.data);
      case BRIDGE_ERROR_CODES.METHOD_NOT_FOUND:
        return new MethodNotFoundError(err.message, err.data);
      case BRIDGE_ERROR_CODES.INVALID_ARGS:
        return new InvalidArgsError(err.message, err.data);
      case BRIDGE_ERROR_CODES.PROTOCOL_MISMATCH:
        return new ProtocolMismatchError(err.message, err.data);
      default:
        return new AuroboreError(err.code, err.message, err.data);
    }
  }
  function isAuroboreError(value) {
    return value instanceof AuroboreError;
  }

  // ../core/dist/aurobore.js
  var boundBridge = null;
  function resolveBridge() {
    if (boundBridge)
      return boundBridge;
    const g = globalThis;
    if (!g.Aurobore) {
      throw new AuroboreError("BRIDGE_NOT_READY", "Aurobore bridge is not available. Run inside the Aurobore runtime or call bindAurobore() in tests.");
    }
    return g.Aurobore;
  }
  function getAurobore() {
    return resolveBridge();
  }

  // src/errors.ts
  function domException(name, message) {
    return new DOMException(message, name);
  }
  function mapAuroboreCode(code, message) {
    switch (code) {
      case "BRIDGE_PERMISSION_DENIED":
      case "GEOLOCATION_CANCELLED":
      case "CAMERA_CANCELLED":
        return domException("NotAllowedError", message);
      case "BRIDGE_TIMEOUT":
        return domException("TimeoutError", message);
      case "BRIDGE_CANCELLED":
        return domException("AbortError", message);
      case "GEOLOCATION_UNAVAILABLE":
      case "CAMERA_UNAVAILABLE":
        return domException("NotFoundError", message);
      case "CAMERA_CAPTURE_FAILED":
        return domException("NotReadableError", message);
      default:
        return domException("Error", message || code);
    }
  }
  function toPositionError(error) {
    if (isAuroboreError(error)) {
      const code = positionErrorCode(error.code);
      const err2 = {
        code,
        message: error.message,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3
      };
      return err2;
    }
    const err = {
      code: 2,
      message: error instanceof Error ? error.message : String(error),
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3
    };
    return err;
  }
  function positionErrorCode(code) {
    if (code === "BRIDGE_PERMISSION_DENIED" || code === "GEOLOCATION_CANCELLED") return 1;
    if (code === "BRIDGE_TIMEOUT") return 3;
    return 2;
  }
  function catchAurobore(fn) {
    return fn().catch((e) => {
      if (isAuroboreError(e)) throw mapAuroboreCode(e.code, e.message);
      throw e;
    });
  }

  // src/clipboard.ts
  function needsClipboardPolyfill() {
    const c = navigator.clipboard;
    if (!c) return true;
    return typeof c.readText !== "function" || typeof c.writeText !== "function";
  }
  function installClipboardPolyfill() {
    if (!needsClipboardPolyfill()) return;
    const clipboard = {
      writeText(text) {
        return catchAurobore(
          () => getAurobore().invoke("Clipboard", "copy", { text })
        );
      },
      readText() {
        return catchAurobore(async () => {
          const result = await getAurobore().invoke("Clipboard", "paste", {});
          return result.text ?? "";
        });
      }
    };
    Object.defineProperty(navigator, "clipboard", {
      value: clipboard,
      configurable: true,
      writable: true
    });
  }

  // src/geolocation.ts
  function toGeolocationPosition(pos) {
    const coords = {
      latitude: pos.latitude,
      longitude: pos.longitude,
      accuracy: pos.accuracy ?? 0,
      altitude: pos.altitude ?? null,
      altitudeAccuracy: pos.altitudeAccuracy ?? null,
      heading: pos.heading ?? null,
      speed: pos.speed ?? null,
      toJSON() {
        return {
          latitude: this.latitude,
          longitude: this.longitude,
          accuracy: this.accuracy,
          altitude: this.altitude,
          altitudeAccuracy: this.altitudeAccuracy,
          heading: this.heading,
          speed: this.speed
        };
      }
    };
    return {
      coords,
      timestamp: pos.timestamp,
      toJSON() {
        return { coords: this.coords.toJSON(), timestamp: this.timestamp };
      }
    };
  }
  var nextWatchId = 1;
  var watches = /* @__PURE__ */ new Map();
  function installGeolocationPolyfill() {
    const nav = navigator;
    if (nav.geolocation && typeof nav.geolocation.getCurrentPosition === "function") {
      return;
    }
    const geolocation = {
      getCurrentPosition(success, error, options) {
        getAurobore().invoke("Geolocation", "getCurrentPosition", {
          enableHighAccuracy: options?.enableHighAccuracy,
          timeout: options?.timeout,
          maximumAge: options?.maximumAge
        }).then((result) => success(toGeolocationPosition(result))).catch((e) => error?.(toPositionError(e)));
      },
      watchPosition(success, error, options) {
        const watchId = nextWatchId++;
        getAurobore().invoke(
          "Geolocation",
          "watch",
          {
            enableHighAccuracy: options?.enableHighAccuracy,
            timeout: options?.timeout,
            maximumAge: options?.maximumAge
          },
          { stream: true }
        ).then((sub) => {
          const subscription = sub;
          subscription.onData = (payload) => {
            success(toGeolocationPosition(payload));
          };
          subscription.onError = (bridgeErr) => {
            error?.({
              code: 2,
              message: bridgeErr.message,
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3
            });
          };
          subscription.onComplete = () => {
            watches.delete(watchId);
          };
          watches.set(watchId, { subscription, success, error });
        }).catch((e) => error?.(toPositionError(e)));
        return watchId;
      },
      clearWatch(watchId) {
        const entry = watches.get(watchId);
        if (!entry) return;
        entry.subscription.stop();
        watches.delete(watchId);
        getAurobore().invoke("Geolocation", "clearWatch", { watchId: entry.subscription.subscriptionId }).catch(() => {
        });
      }
    };
    Object.defineProperty(nav, "geolocation", {
      value: geolocation,
      configurable: true,
      writable: true
    });
  }

  // src/media-stream.ts
  function decodeFramePayload(payload) {
    if (typeof payload !== "object" || payload === null) return null;
    const p = payload;
    if (p.kind !== "frame" || typeof p.binaryPayload !== "string") return null;
    return {
      kind: "frame",
      format: p.format ?? "jpeg",
      width: Number(p.width) || 0,
      height: Number(p.height) || 0,
      timestamp: Number(p.timestamp) || Date.now(),
      binaryPayload: p.binaryPayload
    };
  }
  function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }
  var PolyfillMediaStreamTrack = class {
    constructor(id, canvas, ctx, stopFn) {
      __publicField(this, "kind", "video");
      __publicField(this, "id");
      __publicField(this, "label", "Aurobore camera");
      __publicField(this, "enabled", true);
      __publicField(this, "muted", false);
      __publicField(this, "readyState", "live");
      __publicField(this, "onended", null);
      __publicField(this, "onmute", null);
      __publicField(this, "onunmute", null);
      __publicField(this, "stopFn");
      __publicField(this, "canvas");
      __publicField(this, "ctx");
      this.id = id;
      this.canvas = canvas;
      this.ctx = ctx;
      this.stopFn = stopFn;
    }
    stop() {
      if (this.readyState === "ended") return;
      this.readyState = "ended";
      this.stopFn();
      this.onended?.call(this, new Event("ended"));
    }
    getSettings() {
      return { width: this.canvas.width, height: this.canvas.height };
    }
    getConstraints() {
      return {};
    }
    applyConstraints() {
      return Promise.resolve();
    }
    clone() {
      return this;
    }
    addEventListener() {
    }
    removeEventListener() {
    }
    dispatchEvent() {
      return false;
    }
    drawFrame(frame) {
      if (this.readyState !== "live") return;
      const bytes = base64ToArrayBuffer(frame.binaryPayload);
      const blob = new Blob([bytes], { type: frame.format === "jpeg" ? "image/jpeg" : "image/png" });
      createImageBitmap(blob).then((bitmap) => {
        if (this.readyState !== "live") return;
        if (this.canvas.width !== frame.width) this.canvas.width = frame.width;
        if (this.canvas.height !== frame.height) this.canvas.height = frame.height;
        this.ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
      });
    }
  };
  var PolyfillMediaStream = class {
    constructor(tracks, fps) {
      __publicField(this, "id");
      __publicField(this, "active", true);
      __publicField(this, "onaddtrack", null);
      __publicField(this, "onremovetrack", null);
      __publicField(this, "tracks");
      __publicField(this, "captureStream");
      this.id = `aurobore-ms-${Date.now()}`;
      this.tracks = tracks;
      const canvas = tracks[0].canvas;
      this.captureStream = canvas.captureStream(fps);
    }
    getTracks() {
      return this.captureStream.getTracks();
    }
    getVideoTracks() {
      return this.captureStream.getVideoTracks();
    }
    getAudioTracks() {
      return [];
    }
    getTrackById(id) {
      return this.captureStream.getTrackById(id);
    }
    addTrack() {
    }
    removeTrack() {
    }
    clone() {
      return this.captureStream.clone();
    }
    addEventListener() {
    }
    removeEventListener() {
    }
    dispatchEvent() {
      return false;
    }
    get internalTracks() {
      return this.tracks;
    }
    get streamForVideo() {
      return this.captureStream;
    }
  };
  function createVideoStreamFromSubscription(subscription, maxFps) {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D not available");
    const track = new PolyfillMediaStreamTrack(
      `aurobore-track-${subscription.subscriptionId}`,
      canvas,
      ctx,
      () => subscription.stop()
    );
    subscription.onData = (payload) => {
      const frame = decodeFramePayload(payload);
      if (frame) track.drawFrame(frame);
    };
    subscription.onError = () => track.stop();
    subscription.onComplete = () => track.stop();
    return new PolyfillMediaStream([track], maxFps);
  }

  // src/media-devices.ts
  function parseVideoConstraints(video) {
    if (!video || video === true) return {};
    const out = {};
    const c = video;
    if (c.facingMode !== void 0) {
      out.facingMode = typeof c.facingMode === "string" ? c.facingMode : c.facingMode.ideal;
    }
    if (c.width !== void 0) {
      out.width = typeof c.width === "number" ? c.width : c.width.ideal;
    }
    if (c.height !== void 0) {
      out.height = typeof c.height === "number" ? c.height : c.height.ideal;
    }
    return out;
  }
  async function getUserMedia(constraints) {
    if (constraints.audio) {
      throw domException("NotFoundError", "Audio capture is not supported in Aurobore polyfills v1");
    }
    if (!constraints.video) {
      throw domException("TypeError", "At least one of audio or video must be requested");
    }
    const videoArgs = parseVideoConstraints(constraints.video);
    const maxFps = 15;
    const sub = await getAurobore().invoke(
      "Camera",
      "watchPreview",
      videoArgs,
      { stream: true, maxFps, streamCoalesce: true }
    );
    const polyfillStream = createVideoStreamFromSubscription(sub, maxFps);
    return polyfillStream.streamForVideo;
  }
  function installMediaDevicesPolyfill() {
    const nav = navigator;
    if (!nav.mediaDevices) {
      Object.defineProperty(nav, "mediaDevices", {
        value: {},
        configurable: true,
        writable: true
      });
    }
    const md = nav.mediaDevices;
    if (typeof md.getUserMedia === "function") return;
    md.getUserMedia = (constraints) => catchAurobore(() => getUserMedia(constraints));
    if (typeof md.enumerateDevices !== "function") {
      md.enumerateDevices = () => Promise.resolve([]);
    }
  }

  // src/notification.ts
  var notificationMap = /* @__PURE__ */ new Map();
  var PolyfillNotification = class {
    constructor(title, options) {
      __publicField(this, "title");
      __publicField(this, "body");
      __publicField(this, "tag");
      __publicField(this, "data");
      __publicField(this, "dir", "auto");
      __publicField(this, "lang", "");
      __publicField(this, "icon", "");
      __publicField(this, "badge", "");
      __publicField(this, "image", "");
      __publicField(this, "requireInteraction", false);
      __publicField(this, "silent", false);
      __publicField(this, "timestamp", Date.now());
      __publicField(this, "vibrate", []);
      __publicField(this, "actions", []);
      __publicField(this, "onclick", null);
      __publicField(this, "onshow", null);
      __publicField(this, "onerror", null);
      __publicField(this, "onclose", null);
      __publicField(this, "id");
      this.title = title;
      this.body = options?.body ?? "";
      this.tag = options?.tag ?? "";
      this.data = options?.data;
      this.id = options?.tag || `n-${Date.now()}`;
      catchAurobore(async () => {
        const result = await getAurobore().invoke("Notifications", "notify", {
          id: this.id,
          title: this.title,
          body: this.body
        });
        this.id = result.id;
        notificationMap.set(this.id, this);
        this.onshow?.call(this, new Event("show"));
      }).catch((e) => {
        this.onerror?.call(this, e);
      });
    }
    close() {
      catchAurobore(() => getAurobore().invoke("Notifications", "cancel", { id: this.id })).finally(
        () => {
          notificationMap.delete(this.id);
          this.onclose?.call(this, new Event("close"));
        }
      );
    }
    addEventListener() {
    }
    removeEventListener() {
    }
    dispatchEvent() {
      return false;
    }
  };
  function installNotificationPolyfill() {
    const g = globalThis;
    if (typeof g.Notification === "function" && g.Notification.permission !== void 0) {
      const proto = g.Notification.prototype;
      if (proto && typeof proto.close === "function") return;
    }
    const NotificationCtor = PolyfillNotification;
    Object.defineProperty(NotificationCtor, "permission", {
      value: "granted",
      writable: false
    });
    NotificationCtor.requestPermission = () => Promise.resolve("granted");
    g.Notification = NotificationCtor;
  }

  // src/share.ts
  function canShareHeuristic(data) {
    if (!data) return true;
    if (data.files && data.files.length > 0) return true;
    if (data.url) return true;
    if (data.text) return true;
    if (data.title) return true;
    return false;
  }
  async function shareViaPlugin(data) {
    const title = data.title;
    if (data.files && data.files.length > 0) {
      const file = data.files[0];
      const url = URL.createObjectURL(file);
      try {
        await getAurobore().invoke("Share", "shareFile", {
          kind: "blob",
          url,
          mimeType: file.type || void 0,
          title
        });
      } finally {
        URL.revokeObjectURL(url);
      }
      return;
    }
    if (data.url) {
      await getAurobore().invoke("Share", "shareUrl", { url: data.url, title });
      return;
    }
    if (data.text) {
      await getAurobore().invoke("Share", "shareText", { text: data.text, title });
      return;
    }
    if (data.title) {
      await getAurobore().invoke("Share", "shareText", { text: data.title, title });
      return;
    }
    throw domException("NotAllowedError", "Share data is empty");
  }
  function installSharePolyfill() {
    const nav = navigator;
    if (typeof nav.share === "function") return;
    nav.share = (data) => catchAurobore(() => shareViaPlugin(data ?? {}));
    nav.canShare = (data) => canShareHeuristic(data);
  }

  // src/types.ts
  var POLYFILL_IDS = [
    "geolocation",
    "share",
    "notification",
    "clipboard",
    "mediaDevices"
  ];
  var DEFAULT_POLYFILL_IDS = [
    "geolocation",
    "share",
    "notification",
    "clipboard"
  ];

  // src/index.ts
  var INSTALLERS = {
    geolocation: installGeolocationPolyfill,
    share: installSharePolyfill,
    notification: installNotificationPolyfill,
    clipboard: installClipboardPolyfill,
    mediaDevices: installMediaDevicesPolyfill
  };
  function waitForBridge() {
    const g = globalThis;
    if (g.Aurobore) return Promise.resolve();
    return new Promise((resolve) => {
      const tick = () => {
        if (g.Aurobore) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
    });
  }
  async function installPolyfills(options = {}) {
    const wait = options.waitForBridge !== false;
    if (wait) await waitForBridge();
    const ids = options.only ?? [...DEFAULT_POLYFILL_IDS];
    for (const id of ids) {
      INSTALLERS[id]?.();
    }
  }

  // src/bundle.ts
  function resolveOnlyFromScript() {
    const current = document.currentScript;
    const raw = current?.dataset?.polyfills;
    if (!raw) return void 0;
    const valid = new Set(POLYFILL_IDS);
    const ids = raw.split(",").map((s) => s.trim()).filter((s) => valid.has(s));
    return ids.length > 0 ? ids : void 0;
  }
  var only = resolveOnlyFromScript();
  installPolyfills(only ? { only } : {}).catch((err) => {
    console.error("[aurobore-polyfills] bootstrap failed:", err);
  });
})();
