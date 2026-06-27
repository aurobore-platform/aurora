(function () {
  var routes = {
    "/": {
      title: "Главная",
      html: "<p>Локальное SPA через <code>aurobore-app://</code>.</p>",
    },
    "/about": {
      title: "О приложении",
      html: "<p>Runtime M1 — минимальный контейнер Aurobore.</p>",
    },
    "/settings": {
      title: "Настройки",
      html: "<p>Демо-маршрут для History API.</p>",
    },
  };

  var statusEl = document.getElementById("status");
  var viewEl = document.getElementById("view");
  var routeDepth = 0;

  // На file:// pushState("/about") ведёт на file:///about — ломает страницу. Используем hash-маршруты.
  function currentPath() {
    var hash = (location.hash || "").replace(/^#/, "");
    if (!hash || hash === "/") return "/";
    return hash.charAt(0) === "/" ? hash : "/" + hash;
  }

  function pathToHash(path) {
    return path === "/" ? "#/" : "#" + path;
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
    console.log("[aurobore-web] " + text);
  }

  function renderRoute(path) {
    var route = routes[path] || routes["/"];
    if (viewEl) {
      viewEl.innerHTML = "<h2>" + route.title + "</h2>" + route.html;
    }
    setStatus("Маршрут: " + path + " | scheme: " + location.protocol);
  }

  function navigate(path, replace) {
    var state = { path: path, depth: ++routeDepth };
    var hash = pathToHash(path);
    if (replace) {
      history.replaceState(state, "", hash);
    } else {
      history.pushState(state, "", hash);
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

  function onRouteChange() {
    var path = currentPath();
    renderRoute(path);
    setStatus("маршрут → " + path);
  }

  window.addEventListener("popstate", onRouteChange);
  window.addEventListener("hashchange", onRouteChange);

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
    setStatus("ready | entry: aurobore-app://localhost/index.html");
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

  function onReady() {
    if (!location.hash) {
      navigate("/", true);
    } else {
      renderRoute(currentPath());
    }

    setTimeout(function () {
      if (typeof sendAsyncMessage === "function") {
        sendAsyncMessage("aurobore:ready", { ok: true });
      } else {
        console.log("[aurobore-web] sendAsyncMessage unavailable");
      }
      console.log(
        "[aurobore-container] M1 OK: aurobore-app loaded, lifecycle ready, SPA back works"
      );
    }, 800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();
