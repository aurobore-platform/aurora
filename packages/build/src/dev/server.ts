import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { findMonorepoRoot } from "../codegen/project.js";
import { tryServeBridgeAsset } from "./bridgeAssets.js";

export interface DevServerOptions {
  root: string;
  port: number;
  host?: string;
  onReload?: () => void;
  /** Каталог .aurobore/dev-assets с bridge/bootstrap/plugins. */
  assetsDir?: string;
}

const RELOAD_SCRIPT = `
<script>
(function(){
  var es = new EventSource("/__aurobore_reload");
  es.onmessage = function(){ location.reload(); };
})();
</script>`;

function contentType(filePath: string): string {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

export interface DevServerHandle {
  server: http.Server;
  notifyReload: () => void;
}

/** Простой static dev server с SSE live reload. */
export function startDevServer(options: DevServerOptions): DevServerHandle {
  const host = options.host ?? "0.0.0.0";
  const clients = new Set<http.ServerResponse>();

  const notifyReload = () => {
    for (const client of clients) {
      client.write("data: reload\n\n");
    }
    options.onReload?.();
  };

  const server = http.createServer((req, res) => {
    if (req.url === "/__aurobore_reload") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write("\n");
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }

    const rawPath = (req.url ?? "/").split("?")[0] ?? "/";
    const urlPath = decodeURIComponent(rawPath);

    if (options.assetsDir && tryServeBridgeAsset(urlPath, options.assetsDir, res)) {
      return;
    }

    let filePath = path.join(options.root, urlPath === "/" ? "index.html" : urlPath.replace(/^\//, ""));

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    let body = fs.readFileSync(filePath);
    let type = contentType(filePath);
    if (filePath.endsWith(".html")) {
      const html = body.toString("utf8");
      body = Buffer.from(html.includes("</body>") ? html.replace("</body>", `${RELOAD_SCRIPT}</body>`) : html + RELOAD_SCRIPT);
    }

    res.writeHead(200, { "Content-Type": type });
    res.end(body);
  });

  server.listen(options.port, host, () => {
    console.log(`[dev] server http://${host}:${options.port}/ → ${options.root}`);
  });

  watchTree(options.root, notifyReload);

  return { server, notifyReload };
}

function watchTree(root: string, onChange: () => void): fs.FSWatcher {
  let debounce: ReturnType<typeof setTimeout> | null = null;
  const fire = () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(onChange, 200);
  };

  return fs.watch(root, { recursive: true }, (_event, filename) => {
    if (filename) fire();
  });
}

export function resolveDevHost(): string {
  const nets = os.networkInterfaces();
  for (const entries of Object.values(nets)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) return entry.address;
    }
  }
  return "127.0.0.1";
}

export function resolveTemplateDir(templateName: string): string {
  const monorepo = findMonorepoRoot();
  if (!monorepo) throw new Error("Cannot locate templates/ (not in monorepo)");
  const dir = path.join(monorepo, "templates", templateName);
  if (!fs.existsSync(dir)) throw new Error(`Template not found: ${templateName}`);
  return dir;
}

export function copyTemplate(templateDir: string, targetDir: string, vars: Record<string, string>): void {
  function walk(rel: string): void {
    const abs = path.join(templateDir, rel);
    const out = path.join(targetDir, rel);
    const st = fs.statSync(abs);
    if (st.isDirectory()) {
      fs.mkdirSync(out, { recursive: true });
      for (const name of fs.readdirSync(abs)) {
        if (name === "node_modules") continue;
        walk(path.join(rel, name));
      }
      return;
    }
    let content = fs.readFileSync(abs, "utf8");
    for (const [key, value] of Object.entries(vars)) {
      content = content.replaceAll(`{{${key}}}`, value);
    }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, content, "utf8");
  }
  walk("");
}
