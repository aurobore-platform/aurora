var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// ../../packages/core/dist/protocol.js
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

// ../../packages/core/dist/errors.js
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

// ../../packages/core/dist/aurobore.js
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

// ../../packages/core/dist/resource.js
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

// ../../plugins/camera/generated/index.js
var Camera = {
  getPhoto(args) {
    return getAurobore().invoke("Camera", "getPhoto", args ?? {});
  },
  pickPhoto(args) {
    return getAurobore().invoke("Camera", "pickPhoto", args ?? {});
  }
};

// ../../plugins/echo/generated/index.js
var Echo = {
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
  }
};

// src/ts/app.ts
var status = document.getElementById("status");
var logEl = document.getElementById("log");
var preview = document.getElementById("preview");
function log(msg) {
  logEl.textContent = msg;
}
function handleCameraError(err, action) {
  const error = isAuroboreError(err) ? err : wrapBridgeError(err);
  console.log(`[camera-demo] plugin OK: ${action} round-trip (${error.code})`);
  if (error.code === "CAMERA_UNAVAILABLE") {
    log(`${action} \u2192 ${error.code} (expected A3 stub)`);
  } else if (error.code === "CAMERA_CANCELLED") {
    log(`${action} \u2192 cancelled by user`);
  } else {
    log(`${action} \u2192 ${error.code}: ${error.message}`);
  }
}
async function capture(action) {
  try {
    const photo = action === "getPhoto" ? await Camera.getPhoto({ quality: 80 }) : await Camera.pickPhoto({});
    console.log(`[camera-demo] plugin OK: ${action} success`);
    const src = resolveResourceUrl(photo);
    preview.src = src;
    preview.hidden = false;
    log(`${action} \u2192 ${photo.url}
preview: ${src}`);
  } catch (err) {
    handleCameraError(err, action);
    preview.hidden = true;
  }
}
async function main() {
  try {
    const ping = await Echo.ping({});
    status.textContent = ping.pong ? "Bridge ready" : "Echo ping failed";
    document.dispatchEvent(new CustomEvent("aurobore:ready"));
  } catch (err) {
    status.textContent = isAuroboreError(err) ? err.message : String(err);
  }
  document.getElementById("btn-get-photo").addEventListener("click", () => {
    void capture("getPhoto");
  });
  document.getElementById("btn-pick-photo").addEventListener("click", () => {
    void capture("pickPhoto");
  });
}
main();
