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
  A.Storage = {
    get: function (args) { return A.invoke("Storage", "get", args || {}); },
    set: function (args) { return A.invoke("Storage", "set", args || {}); },
    remove: function (args) { return A.invoke("Storage", "remove", args || {}); },
    keys: function (args) { return A.invoke("Storage", "keys", args || {}); },
    clear: function (args) { return A.invoke("Storage", "clear", args || {}); },
  };
  A.__plugins["Storage"] = { version: "1.0.0", methods: ["get","set","remove","keys","clear"], events: [] };
  A.FileSystem = {
    readText: function (args) { return A.invoke("FileSystem", "readText", args || {}); },
    writeText: function (args) { return A.invoke("FileSystem", "writeText", args || {}); },
    exists: function (args) { return A.invoke("FileSystem", "exists", args || {}); },
    mkdir: function (args) { return A.invoke("FileSystem", "mkdir", args || {}); },
    delete: function (args) { return A.invoke("FileSystem", "delete", args || {}); },
    list: function (args) { return A.invoke("FileSystem", "list", args || {}); },
  };
  A.__plugins["FileSystem"] = { version: "1.0.0", methods: ["readText","writeText","exists","mkdir","delete","list"], events: [] };
  A.Clipboard = {
    copy: function (args) { return A.invoke("Clipboard", "copy", args || {}); },
    paste: function (args) { return A.invoke("Clipboard", "paste", args || {}); },
  };
  A.__plugins["Clipboard"] = { version: "1.0.0", methods: ["copy","paste"], events: [] };
  A.Network = {
    getStatus: function (args) { return A.invoke("Network", "getStatus", args || {}); },
  };
  A.__plugins["Network"] = { version: "1.0.0", methods: ["getStatus"], events: ["network:change"] };
  console.log("[aurobore-plugins] M3 plugins registered:", Object.keys(A.__plugins));
})();
