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
function on(name, handler) {
  return resolveBridge().on(name, handler);
}
function once(name, handler) {
  const bridge = resolveBridge();
  if (bridge.once) {
    return bridge.once(name, handler);
  }
  let off2;
  const wrapped = (data) => {
    off2?.();
    handler(data);
  };
  off2 = bridge.on(name, wrapped);
  return () => off2?.();
}

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

// ../../plugins/device/generated/index.js
var Device = {
  getInfo(args) {
    return getAurobore().invoke("Device", "getInfo", args ?? {});
  }
};

// src/ts/app.ts
var status = document.getElementById("status");
var logEl = document.getElementById("log");
var deviceEl = document.getElementById("device");
var lifecycleEl = document.getElementById("lifecycle");
var benchEl = document.getElementById("bench");
var btnStop = document.getElementById("btn-stop");
var activeStream = null;
function log(msg) {
  logEl.textContent = msg;
}
function addLifecycle(event) {
  const li = document.createElement("li");
  li.textContent = `${(/* @__PURE__ */ new Date()).toISOString().slice(11, 19)} \u2014 ${event}`;
  lifecycleEl.prepend(li);
}
async function main() {
  once("ready", () => addLifecycle("ready (once)"));
  on("pause", () => addLifecycle("pause"));
  on("resume", () => addLifecycle("resume"));
  try {
    const ping = await Echo.ping({});
    status.textContent = ping.pong ? "Bridge ready" : "Echo ping failed";
    document.dispatchEvent(new CustomEvent("aurobore:ready"));
  } catch (err) {
    status.textContent = isAuroboreError(err) ? err.message : String(err);
  }
  document.getElementById("btn-ping").addEventListener("click", async () => {
    try {
      const r = await Echo.ping({});
      log(`ping \u2192 pong=${r.pong}, ts=${r.ts}`);
    } catch (err) {
      log(String(err));
    }
  });
  document.getElementById("btn-echo").addEventListener("click", async () => {
    try {
      const r = await Echo.echo({ text: "Hello Aurobore" });
      log(`echo \u2192 ${JSON.stringify(r)}`);
    } catch (err) {
      log(String(err));
    }
  });
  document.getElementById("btn-fail").addEventListener("click", async () => {
    try {
      await Echo.fail({});
      log("fail \u2192 unexpected success");
    } catch (err) {
      const wrapped = isAuroboreError(err) ? err : wrapBridgeError(err);
      log(`fail \u2192 ${wrapped.code}: ${wrapped.message}`);
    }
  });
  document.getElementById("btn-stream").addEventListener("click", async () => {
    if (activeStream) return;
    const ticks = [];
    try {
      const sub = await Echo.watchTicks({});
      activeStream = sub;
      btnStop.disabled = false;
      sub.onData = (payload) => {
        const tick = payload.tick;
        ticks.push(tick);
        log(`stream tick ${tick} (${ticks.join(", ")})`);
      };
      sub.onError = (err) => {
        log(`stream error: ${err.message}`);
        activeStream = null;
        btnStop.disabled = true;
      };
      sub.onComplete = () => {
        log(`stream complete: [${ticks.join(", ")}]`);
        activeStream = null;
        btnStop.disabled = true;
      };
    } catch (err) {
      log(String(err));
    }
  });
  btnStop.addEventListener("click", () => {
    activeStream?.stop();
    activeStream = null;
    btnStop.disabled = true;
    log("stream stopped by user");
  });
  document.getElementById("btn-device").addEventListener("click", async () => {
    try {
      const info = await Device.getInfo({});
      deviceEl.textContent = JSON.stringify(info, null, 2);
    } catch (err) {
      deviceEl.textContent = String(err);
    }
  });
  document.getElementById("btn-bench").addEventListener("click", async () => {
    benchEl.textContent = "Running\u2026";
    const samples = [];
    const count = 100;
    try {
      for (let i = 0; i < count; i++) {
        const t0 = performance.now();
        await Echo.ping({});
        samples.push(performance.now() - t0);
      }
      samples.sort((a, b) => a - b);
      const median = samples[Math.floor(samples.length / 2)];
      const p95 = samples[Math.floor(samples.length * 0.95)];
      let streamTicks = 0;
      const sub = await Echo.watchTicks({});
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          sub.stop();
          resolve();
        }, 5e3);
        const done = () => {
          clearTimeout(timeout);
          resolve();
        };
        sub.onData = () => {
          streamTicks++;
          if (streamTicks >= 5) {
            sub.stop();
            done();
          }
        };
        sub.onError = () => done();
        sub.onComplete = () => done();
      });
      const summary = `ping n=${count}
median=${median.toFixed(2)} ms
p95=${p95.toFixed(2)} ms
stream ticks=${streamTicks}`;
      benchEl.textContent = summary;
      console.log(`[hello-world] bench: ${summary.replace(/\n/g, "; ")}`);
    } catch (err) {
      benchEl.textContent = String(err);
    }
  });
}
main();
