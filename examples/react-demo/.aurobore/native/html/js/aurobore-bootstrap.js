/**
 * M1 bootstrap — минимальный Aurobore.on до полноценного Bridge (M2).
 */
(function () {
  var handlers = {};

  window.Aurobore = window.Aurobore || {
    on: function (event, handler) {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
      return function () {
        handlers[event] = (handlers[event] || []).filter(function (h) {
          return h !== handler;
        });
      };
    },
    _emit: function (event, data) {
      (handlers[event] || []).forEach(function (h) {
        try {
          h(data);
        } catch (e) {
          console.error("[aurobore-web] handler error:", e);
        }
      });
      console.log("[aurobore-web] lifecycle:", event, data || "");
    },
  };
})();
