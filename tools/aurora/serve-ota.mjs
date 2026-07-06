#!/usr/bin/env node
/**
 * Статический HTTP-сервер для локального OTA output (.ota/).
 * Использование: pnpm ota:serve [--dir examples/ota-demo/.ota] [--port 8765] [--host 0.0.0.0]
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

function parseArgs(argv) {
  let dir = path.join(REPO_ROOT, "examples", "ota-demo", ".ota");
  let port = 8765;
  let host = "0.0.0.0";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dir" && argv[i + 1]) dir = path.resolve(argv[++i]);
    else if (argv[i] === "--port" && argv[i + 1]) port = Number(argv[++i]);
    else if (argv[i] === "--host" && argv[i + 1]) host = argv[++i];
  }
  return { dir, port, host };
}

function contentType(filePath) {
  if (filePath.endsWith(".json")) return "application/json";
  if (filePath.endsWith(".gz")) return "application/gzip";
  if (filePath.endsWith(".sig")) return "text/plain";
  return "application/octet-stream";
}

const { dir, port, host } = parseArgs(process.argv.slice(2));
if (!fs.existsSync(dir)) {
  console.error(`[ota:serve] directory not found: ${dir}`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
  const rel = urlPath.replace(/^\/+/, "").replace(/^ota\/?/, "");
  const filePath = path.join(dir, rel);
  if (!filePath.startsWith(dir)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, { "Content-Type": contentType(filePath), "Cache-Control": "no-store" });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`[ota:serve] ${dir}`);
  console.log(`[ota:serve] http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}/ota/`);
  console.log("[ota:serve] point updates.url to http://<LAN-IP>:" + port + "/ota");
});
