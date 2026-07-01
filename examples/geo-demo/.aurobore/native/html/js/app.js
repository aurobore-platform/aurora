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

// ../../plugins/geolocation/generated/index.js
var Geolocation = {
  getCurrentPosition(args) {
    return getAurobore().invoke("Geolocation", "getCurrentPosition", args ?? {});
  },
  watch(args) {
    return getAurobore().invoke("Geolocation", "watch", args ?? {}, { stream: true });
  },
  clearWatch(args) {
    return getAurobore().invoke("Geolocation", "clearWatch", args ?? {});
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
var btnStop = document.getElementById("btn-stop");
var activeWatch = null;
function log(msg) {
  logEl.textContent = msg;
}
function handleGeoError(err, action) {
  const error = isAuroboreError(err) ? err : wrapBridgeError(err);
  console.log(`[geo-demo] plugin OK: ${action} round-trip (${error.code})`);
  if (error.code === "GEOLOCATION_UNAVAILABLE") {
    log(`${action} \u2192 ${error.code} (expected A3 stub)`);
  } else if (error.code === "GEOLOCATION_CANCELLED") {
    log(`${action} \u2192 cancelled`);
  } else {
    log(`${action} \u2192 ${error.code}: ${error.message}`);
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
  document.getElementById("btn-get-position").addEventListener("click", async () => {
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      console.log("[geo-demo] plugin OK: getCurrentPosition success");
      log(
        `getCurrentPosition \u2192 ${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}
accuracy: ${pos.accuracy ?? "n/a"} m`
      );
    } catch (err) {
      handleGeoError(err, "getCurrentPosition");
    }
  });
  document.getElementById("btn-watch").addEventListener("click", async () => {
    if (activeWatch) return;
    try {
      const sub = await Geolocation.watch({ enableHighAccuracy: true });
      activeWatch = sub;
      btnStop.disabled = false;
      console.log("[geo-demo] plugin OK: watch stream started");
      log("watch \u2192 stream started");
      sub.onData = (payload) => {
        const pos = payload;
        log(`watch data \u2192 ${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`);
      };
      sub.onError = (err) => {
        const error = isAuroboreError(err) ? err : wrapBridgeError(err);
        console.log(`[geo-demo] plugin OK: watch error (${error.code})`);
        log(`watch error \u2192 ${error.code}: ${error.message}`);
        activeWatch = null;
        btnStop.disabled = true;
      };
      sub.onComplete = () => {
        log("watch \u2192 complete");
        activeWatch = null;
        btnStop.disabled = true;
      };
    } catch (err) {
      handleGeoError(err, "watch");
    }
  });
  btnStop.addEventListener("click", () => {
    activeWatch?.stop();
    activeWatch = null;
    btnStop.disabled = true;
    log("watch \u2192 stopped by user");
  });
}
main();
