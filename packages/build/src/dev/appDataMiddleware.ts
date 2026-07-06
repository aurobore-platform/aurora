import fs from "node:fs";
import path from "node:path";

/** Префикс URL app-data в browser mock mode. */
export const APP_DATA_URL_PREFIX = "/app-data/";

/** Пытается отдать файл из {assetsDir}/app-data/; возвращает true если ответ отправлен. */
export function tryServeAppDataAsset(
  urlPath: string,
  assetsDir: string,
  res: { writeHead: (code: number, headers: Record<string, string>) => void; end: (body: Buffer) => void },
): boolean {
  if (!urlPath.startsWith(APP_DATA_URL_PREFIX)) return false;

  const rel = urlPath.slice(APP_DATA_URL_PREFIX.length);
  if (!rel || rel.includes("..")) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(Buffer.from("Forbidden"));
    return true;
  }

  const filePath = path.join(assetsDir, "app-data", rel);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(Buffer.from("Not found"));
    return true;
  }

  res.writeHead(200, { "Content-Type": contentType(filePath) });
  res.end(fs.readFileSync(filePath));
  return true;
}

function contentType(filePath: string): string {
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

/** Express-style middleware для /app-data/* в dev server. */
export function appDataMiddleware(assetsDir: string) {
  return (
    req: { url?: string },
    res: {
      writeHead: (code: number, headers: Record<string, string>) => void;
      end: (body: Buffer) => void;
    },
    next: () => void,
  ): void => {
    const urlPath = (req.url ?? "/").split("?")[0] ?? "/";
    if (tryServeAppDataAsset(urlPath, assetsDir, res)) return;
    next();
  };
}
