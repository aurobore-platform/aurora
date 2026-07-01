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
    watchFastTicks: function (args) { return A.invoke("Echo", "watchFastTicks", args || {}, { stream: true }); },
    getSampleResource: function (args) { return A.invoke("Echo", "getSampleResource", args || {}); },
  };
  A.__plugins["Echo"] = { version: "1.0.0", methods: ["ping","echo","fail","watchTicks","watchFastTicks","getSampleResource"], events: [] };
  A.Camera = {
    getPhoto: function (args) { return A.invoke("Camera", "getPhoto", args || {}); },
    pickPhoto: function (args) { return A.invoke("Camera", "pickPhoto", args || {}); },
  };
  A.__plugins["Camera"] = { version: "1.0.0", methods: ["getPhoto","pickPhoto"], events: [] };
  console.log("[aurobore-plugins] M3 plugins registered:", Object.keys(A.__plugins));
})();
