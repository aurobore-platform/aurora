// @generated — do not edit
(function () {
  if (!globalThis.Aurobore) {
    console.warn("[aurobore-plugins] Aurobore bridge not loaded");
    return;
  }
  var A = globalThis.Aurobore;
  A.__plugins = A.__plugins || {};
  A.Echo = {
    ping: function (args) { return A.invoke("Echo", "ping", args || {}); },
    echo: function (args) { return A.invoke("Echo", "echo", args || {}); },
    fail: function (args) { return A.invoke("Echo", "fail", args || {}); },
    watchTicks: function (args) { return A.invoke("Echo", "watchTicks", args || {}, { stream: true }); },
  };
  A.__plugins["Echo"] = { version: "1.0.0", methods: ["ping","echo","fail","watchTicks"], events: [] };
  A.Device = {
    getInfo: function (args) { return A.invoke("Device", "getInfo", args || {}); },
  };
  A.__plugins["Device"] = { version: "1.0.0", methods: ["getInfo"], events: [] };
  console.log("[aurobore-plugins] M3 plugins registered:", Object.keys(A.__plugins));
})();
