import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { generatePluginBundle } from "../codegen/generate.js";
import { resolvePluginManifests } from "../codegen/project.js";
import { loadConfig } from "../config/parse.js";
import { resolvePluginRefs } from "../plugins/catalog.js";
import { resolveRuntimeRoot } from "../native/runtimePaths.js";

/** Каталог bridge-ассетов для dev-режима (относительно projectRoot). */
export const DEV_ASSETS_DIR = ".aurobore/dev-assets";

/** URL-пути bridge-ассетов → относительный путь внутри DEV_ASSETS_DIR. */
export const BRIDGE_ASSET_ROUTES: Record<string, string> = {
  "/js/aurobore-bridge.js": "js/aurobore-bridge.js",
  "/js/aurobore-bootstrap.js": "js/aurobore-bootstrap.js",
  "/js/aurobore-plugins.js": "js/aurobore-plugins.js",
  "/css/aurobore-chrome.css": "css/aurobore-chrome.css",
};

export interface DevAssetsPaths {
  root: string;
  jsDir: string;
  cssDir: string;
}

/** Абсолютный путь к каталогу dev-ассетов проекта. */
export function devAssetsDir(projectRoot: string): string {
  return path.join(projectRoot, DEV_ASSETS_DIR);
}

/** Пути runtime bridge-скриптов в @aurobore/runtime. */
export function resolveBridgeAssetSources(projectRoot: string): {
  bridgeJs: string;
  bootstrapJs: string;
  chromeCss: string;
} {
  const runtimeRoot = resolveRuntimeRoot({ projectRoot });
  const containerHtml = path.join(runtimeRoot, "container", "html");
  return {
    bridgeJs: path.join(containerHtml, "js", "aurobore-bridge.js"),
    bootstrapJs: path.join(containerHtml, "js", "aurobore-bootstrap.js"),
    chromeCss: path.join(containerHtml, "css", "aurobore-chrome.css"),
  };
}

function copyFileIfExists(src: string, dest: string): void {
  if (!fs.existsSync(src)) {
    throw new Error(`bridge asset not found: ${src}`);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

/** Генерирует aurobore-plugins.js из плагинов проекта. */
export function generateDevPluginsBundle(projectRoot: string, outPath: string): void {
  const { config } = loadConfig(projectRoot);
  const pluginRefs = resolvePluginRefs(config.plugins);
  const manifests =
    pluginRefs.length > 0 ? resolvePluginManifests(projectRoot, pluginRefs) : [];
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, generatePluginBundle(manifests), "utf8");
}

/** Копирует bridge/bootstrap/chrome + plugins bundle в .aurobore/dev-assets/. */
export function materializeDevAssets(projectRoot: string): DevAssetsPaths {
  const root = devAssetsDir(projectRoot);
  const jsDir = path.join(root, "js");
  const cssDir = path.join(root, "css");
  const sources = resolveBridgeAssetSources(projectRoot);

  copyFileIfExists(sources.bridgeJs, path.join(jsDir, "aurobore-bridge.js"));
  copyFileIfExists(sources.bootstrapJs, path.join(jsDir, "aurobore-bootstrap.js"));
  copyFileIfExists(sources.chromeCss, path.join(cssDir, "aurobore-chrome.css"));
  generateDevPluginsBundle(projectRoot, path.join(jsDir, "aurobore-plugins.js"));

  return { root, jsDir, cssDir };
}

/** Пытается отдать bridge-ассет; возвращает true если ответ отправлен. */
export function tryServeBridgeAsset(
  urlPath: string,
  assetsDir: string,
  res: { writeHead: (code: number, headers: Record<string, string>) => void; end: (body: Buffer) => void },
): boolean {
  const rel = BRIDGE_ASSET_ROUTES[urlPath];
  if (!rel) return false;

  const filePath = path.join(assetsDir, rel);
  if (!fs.existsSync(filePath)) return false;

  const type = rel.endsWith(".css")
    ? "text/css; charset=utf-8"
    : "application/javascript; charset=utf-8";
  res.writeHead(200, { "Content-Type": type });
  res.end(fs.readFileSync(filePath));
  return true;
}

/** Express-style middleware для Vite / static dev server. */
export function bridgeAssetsMiddleware(assetsDir: string) {
  return (
    req: { url?: string },
    res: {
      writeHead: (code: number, headers: Record<string, string>) => void;
      end: (body: Buffer) => void;
    },
    next: () => void,
  ): void => {
    const urlPath = (req.url ?? "/").split("?")[0] ?? "/";
    if (tryServeBridgeAsset(urlPath, assetsDir, res)) return;
    next();
  };
}

/** file:// URL для динамического import vite из проекта. */
export function resolveProjectModuleUrl(projectRoot: string, modulePath: string): string {
  return pathToFileURL(path.join(projectRoot, "node_modules", modulePath)).href;
}
