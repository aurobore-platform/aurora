(function () {
  var routes = {
    "/": {
      title: "Главная",
      html:
        "<p>Локальное SPA через loopback origin (<code>https://127.0.0.1</code>).</p>" +
        "<p id=\"m3-device\">Device: …</p>" +
        "<p id=\"m3-storage\">Storage: …</p>",
    },
    "/about": {
      title: "О приложении",
      html: "<p>Runtime M3 — контейнер Aurobore + Bridge + Plugins.</p>",
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
  var a1Checks = { fastStream: false, resource: false };
  var m3Checks = { device: false, storage: false, plugins: false };
  var a2Checks = { deeplink: false, chrome: false, keyboard: false, viewport: false };

  function handleDeepLink(data) {
    if (!data || !data.url) return;
    a2Checks.deeplink = true;
    console.log("[aurobore-container] A2 deeplink OK: " + data.url);
    setStatus("deeplink: " + data.url);
    try {
      var parsed = new URL(data.url);
      var path = parsed.pathname || "/";
      if (parsed.hash && parsed.hash.length > 1) {
        path = parsed.hash.slice(1);
      }
      if (path.charAt(0) !== "/") path = "/" + path;
      navigate(path, false);
    } catch (e) {
      console.error("[aurobore-web] deeplink parse error:", e);
    }
  }

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

  function maybeA1Ok() {
    if (a1Checks.fastStream && a1Checks.resource) {
      console.log(
        "[aurobore-container] A1 OK: bridge backpressure + resource-ref verified"
      );
      if (typeof sendAsyncMessage === "function") {
        sendAsyncMessage("aurobore:a1-ok", { ok: true });
      }
    }
  }

  function maybeM3Ok() {
    if (m3Checks.device && m3Checks.storage && m3Checks.plugins) {
      console.log(
        "[aurobore-container] M3 OK: plugins registered, Device + Storage verified"
      );
      if (typeof sendAsyncMessage === "function") {
        sendAsyncMessage("aurobore:m3-ok", { ok: true });
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

  var coverDemoEnabled = /(?:\?|&)coverDemo=1(?:&|$)/.test(location.search);

  function initCoverDemo() {
    if (!window.Aurobore || typeof Aurobore.invoke !== "function") return;

    Aurobore.on("cover:action", function (data) {
      setStatus("cover:action: " + JSON.stringify(data));
      console.log("[aurobore-web] cover:action", data);
    });

    Aurobore.invoke("Cover", "setActions", {
      actions: [{ id: "demo", label: "Demo", icon: "icon-m-sync" }],
    }).catch(function (err) {
      console.error("[aurobore-web] cover setActions failed:", err);
    });
  }

  Aurobore.on("ready", function () {
    setStatus("ready | origin: " + location.origin);
    if (coverDemoEnabled) initCoverDemo();
  });
  Aurobore.on("pause", function () {
    setStatus("pause");
    if (coverDemoEnabled) {
      Aurobore.invoke("Cover", "setState", {
        primaryText: "Cover demo",
        secondaryText: "Paused — check the home screen",
      }).catch(function (err) {
        console.error("[aurobore-web] cover setState failed:", err);
      });
    }
  });
  Aurobore.on("resume", function () {
    setStatus("resume");
    if (coverDemoEnabled) {
      Aurobore.invoke("Cover", "reset").catch(function (err) {
        console.error("[aurobore-web] cover reset failed:", err);
      });
    }
  });
  Aurobore.on("backbutton", function () {
    setStatus("backbutton (no SPA history)");
  });
  Aurobore.on("deeplink", handleDeepLink);
  Aurobore.on("appurlopen", handleDeepLink);

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

  function runA1Checks() {
    if (!window.Aurobore || typeof Aurobore.invoke !== "function") {
      return;
    }

    Aurobore.invoke("Echo", "watchFastTicks", {}, { stream: true, maxFps: 60 })
      .then(function (sub) {
        var deliveries = 0;
        var lastTick = 0;
        sub.onData = function (payload) {
          deliveries += 1;
          lastTick = payload.tick;
        };
        sub.onComplete = function () {
          if (deliveries > 0 && deliveries < 60 && lastTick === 60) {
            a1Checks.fastStream = true;
            setStatus("A1 fastStream: " + deliveries + " deliveries / 60 native ticks");
            maybeA1Ok();
          }
        };
      })
      .catch(function (err) {
        console.error("[aurobore-web] watchFastTicks failed:", err);
      });

    Aurobore.invoke("Echo", "getSampleResource")
      .then(function (ref) {
        if (!Aurobore.isResourceRef || !Aurobore.isResourceRef(ref)) {
          console.error("[aurobore-web] getSampleResource: not a ResourceRef");
          return;
        }
        var wireUrl = Aurobore.resolveResourceUrl(ref);
        return fetch(wireUrl).then(function (res) {
          return res.text().then(function (body) {
            if (body.indexOf("Aurobore A1 sample resource") !== -1) {
              a1Checks.resource = true;
              setStatus("A1 resource: " + wireUrl);
              maybeA1Ok();
            }
          });
        });
      })
      .catch(function (err) {
        console.error("[aurobore-web] getSampleResource failed:", err);
      });
  }

  function runM3Checks() {
    if (Aurobore.__plugins && Aurobore.Device && Aurobore.Storage) {
      m3Checks.plugins = true;
    }

    if (Aurobore.Device && typeof Aurobore.Device.getInfo === "function") {
      Aurobore.Device.getInfo()
        .then(function (info) {
          m3Checks.device = true;
          var el = document.getElementById("m3-device");
          if (el) el.textContent = "Device: " + JSON.stringify(info);
          maybeM3Ok();
        })
        .catch(function (err) {
          console.error("[aurobore-web] Device.getInfo failed:", err);
        });
    }

    if (Aurobore.Storage && typeof Aurobore.Storage.set === "function") {
      Aurobore.Storage.set({ key: "demo", value: "m3" })
        .then(function () {
          return Aurobore.Storage.get({ key: "demo" });
        })
        .then(function (result) {
          if (result && result.value === "m3") {
            m3Checks.storage = true;
            var el = document.getElementById("m3-storage");
            if (el) el.textContent = "Storage: " + JSON.stringify(result);
            maybeM3Ok();
          }
        })
        .catch(function (err) {
          console.error("[aurobore-web] Storage failed:", err);
        });
    }
  }

  function maybeA2Ok() {
    if (a2Checks.chrome && a2Checks.viewport) {
      console.log(
        "[aurobore-container] A2 OK: Runtime+ deep links, scopes, system chrome verified"
      );
      if (typeof sendAsyncMessage === "function") {
        sendAsyncMessage("aurobore:a2-ok", { ok: true });
      }
    }
  }

  function runA2Checks() {
    var root = document.documentElement;
    var top = getComputedStyle(root).getPropertyValue("--aurobore-safe-area-top").trim();
    if (top && top !== "0px") {
      a2Checks.chrome = true;
      console.log("[aurobore-container] A2 chrome OK: safe-area-top=" + top);
    }

    var viewportMeta = document.querySelector('meta[name="viewport"]');
    if (viewportMeta && /viewport-fit=cover/.test(viewportMeta.getAttribute("content") || "")) {
      a2Checks.viewport = true;
      console.log("[aurobore-container] A2 chrome OK: viewport-fit=cover");
    }

    var keyboardInput = document.getElementById("a2-keyboard-test");
    var innerHeightBeforeKeyboard = 0;
    if (keyboardInput) {
      keyboardInput.addEventListener("focus", function () {
        innerHeightBeforeKeyboard = window.innerHeight;
        setStatus("A2: focus input — ожидаем keyboard inset");
      });
    }

    Aurobore.on("systemChrome:insetsChanged", function (insets) {
      if (insets && insets.top > 0) {
        a2Checks.chrome = true;
        console.log("[aurobore-container] A2 chrome OK: insetsChanged", insets);
      }
      if (insets && insets.bottom > 0) {
        a2Checks.keyboard = true;
        console.log("[aurobore-container] A2 keyboard OK: bottom inset=" + insets.bottom);
        if (innerHeightBeforeKeyboard > 0) {
          var delta = Math.abs(window.innerHeight - innerHeightBeforeKeyboard);
          if (delta === 0) {
            console.log("[aurobore-container] A2 keyboard OK: innerHeight stable (" + window.innerHeight + ")");
          } else {
            console.warn(
              "[aurobore-container] A2 keyboard WARN: innerHeight changed by " + delta +
                " (" + innerHeightBeforeKeyboard + " → " + window.innerHeight + ")"
            );
          }
        }
      }
      maybeA2Ok();
    });

    maybeA2Ok();
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
        "[aurobore-container] M1 OK: aurobore-app loaded, lifecycle ready, SPA back works" +
          (window.isSecureContext ? ", secure context" : ", insecure context")
      );
      setTimeout(function () {
        runM2Checks();
        runA1Checks();
        runM3Checks();
        runA2Checks();
      }, 400);
    }, 800);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();
