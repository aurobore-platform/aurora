import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const version = process.env.BUNDLE_VERSION ?? "1.0.0";
const distDir = path.join(root, "dist");
fs.mkdirSync(distDir, { recursive: true });

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OTA Demo</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; background: #0f172a; color: #e2e8f0; }
    .badge { display: inline-block; padding: 0.5rem 1rem; border-radius: 999px; background: #22c55e; color: #052e16; font-weight: 700; }
    #status { margin-top: 1rem; font-size: 0.9rem; color: #94a3b8; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>OTA Demo</h1>
  <p>Bundle version: <span class="badge" id="ver">${version}</span></p>
  <p id="status">Waiting for bridge…</p>
  <script src="js/aurobore-bridge.js"></script>
  <script src="js/aurobore-plugins.js"></script>
  <script>
    function log(line) {
      var el = document.getElementById("status");
      el.textContent = (el.textContent ? el.textContent + "\\n" : "") + line;
    }
    function boot() {
      if (!window.Aurobore) { setTimeout(boot, 50); return; }
      ["update:available","update:ready","update:applied","update:error"].forEach(function (ev) {
        Aurobore.on(ev, function (data) { log(ev + ": " + JSON.stringify(data)); });
      });
      Aurobore.invoke("Updates", "check").catch(function (e) { log("check failed: " + e.message); });
      if (typeof sendAsyncMessage === "function") sendAsyncMessage("aurobore:ready", "ok");
    }
    boot();
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(distDir, "index.html"), html);
console.log(`[build:web] ota-demo dist/ (BUNDLE_VERSION=${version})`);
