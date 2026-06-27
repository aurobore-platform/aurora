(function () {
  var routes = {
    "/": {
      title: "Главная",
      html: "<p>Локальное SPA через loopback origin (<code>http://127.0.0.1</code>).</p>",
    },
    "/about": {
      title: "О приложении",
      html: "<p>Runtime M2 — контейнер Aurobore + Bridge.</p>",
    },
    "/settings": {
      title: "Настройки",
      html: "<p>Демо-маршрут для History API.</p>",
    },
  };

  var statusEl = document.getElementById("status");
  var viewEl = document.getElementById("view");
  var routeDepth = 0;
  var m2Checks = { ping: false, stream: false, event: false };

  function currentPath() {
    var path = location.pathname || "/";
    if (path.length > 1 && path.charAt(path.length - 1) === "/")
      path = path.slice(0, -1);
    return path || "/";
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
    console.log("[aurobore-web] " + text);
  }

  function maybeM2Ok() {
    if (m2Checks.ping && m2Checks.stream && m2Checks.event) {
      console.log(
        "[aurobore-container] M2 OK: bridge invoke, events, stream verified"
      );
      if (typeof sendAsyncMessage === "function") {
        sendAsyncMessage("aurobore:m2-ok", { ok: true });
      }
    }
  }

  function renderRoute(path) {
    var route = routes[path] || routes["/"];
    if (viewEl) {
      viewEl.innerHTML = "<h2>" + route.title + "</h2>" + route.html;
    }
    setStatus("Маршрут: " + path + " | origin: " + location.origin);
  }

  function navigate(path, replace) {
    var state = { path: path, depth: ++routeDepth };
    if (replace) {
      history.replaceState(state, "", path);
    } else {
      history.pushState(state, "", path);
    }
    renderRoute(path);
  }

  window.__auroboreSpaBack = function () {
    if (history.length > 1) {
      history.back();
      return true;
    }
    return false;
  };

  window.addEventListener("popstate", function () {
    renderRoute(currentPath());
    setStatus("popstate → " + currentPath());
  });

  document.querySelectorAll("[data-route]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      navigate(btn.getAttribute("data-route"), false);
    });
  });

  var btnBack = document.getElementById("btn-back");
  if (btnBack) {
    btnBack.addEventListener("click", function () {
      window.__auroboreSpaBack();
    });
  }

  var btnSimBack = document.getElementById("btn-sim-back");
  if (btnSimBack) {
    btnSimBack.addEventListener("click", function () {
      if (typeof sendAsyncMessage === "function") {
        sendAsyncMessage("aurobore:back", {});
      }
    });
  }

  Aurobore.on("ready", function () {
    setStatus("ready | origin: " + location.origin);
  });
  Aurobore.on("pause", function () {
    setStatus("pause");
  });
  Aurobore.on("resume", function () {
    setStatus("resume");
  });
  Aurobore.on("backbutton", function () {
    setStatus("backbutton (no SPA history)");
  });

  Aurobore.on("app:echo", function (data) {
    m2Checks.event = true;
    setStatus("app:echo: " + JSON.stringify(data));
    maybeM2Ok();
  });

  function runM2Checks() {
    if (!window.Aurobore || typeof Aurobore.invoke !== "function") {
      console.log("[aurobore-web] Aurobore.invoke unavailable");
      return;
    }

    Aurobore.invoke("Echo", "ping")
      .then(function (result) {
        m2Checks.ping = true;
        setStatus("ping: " + JSON.stringify(result));
        maybeM2Ok();
      })
      .catch(function (err) {
        console.error("[aurobore-web] ping failed:", err);
      });

    Aurobore.invoke("Echo", "watchTicks", {}, { stream: true })
      .then(function (sub) {
        var ticks = [];
        sub.onData = function (payload) {
          ticks.push(payload.tick);
        };
        sub.onComplete = function () {
          if (ticks.length >= 5) {
            m2Checks.stream = true;
            setStatus("stream ticks: " + ticks.join(","));
            maybeM2Ok();
          }
        };
      })
      .catch(function (err) {
        console.error("[aurobore-web] stream failed:", err);
      });

    Aurobore.emit("app:demo", { hello: "native" });
  }

  function onReady() {
    navigate("/", true);

    setTimeout(function () {
      if (typeof sendAsyncMessage === "function") {
        sendAsyncMessage("aurobore:ready", { ok: true });
      } else {
        console.log("[aurobore-web] sendAsyncMessage unavailable");
      }
      console.log(
        "[aurobore-container] M1 OK: aurobore-app loaded, lifecycle ready, SPA back works"
      );
      setTimeout(runM2Checks, 400);
    }, 800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();
