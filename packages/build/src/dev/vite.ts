import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { appDataMiddleware } from "./appDataMiddleware.js";
import { bridgeAssetsMiddleware } from "./bridgeAssets.js";
import { injectAuroboreWebMode } from "./webInject.js";
import { resolveDevHost } from "./server.js";

export interface ViteDevServerOptions {
  projectRoot: string;
  port: number;
  assetsDir: string;
  webMode?: boolean;
}

export interface ViteDevServerResult {
  port: number;
  host: string;
  url: string;
  stop: () => Promise<void>;
}

type ViteModule = {
  createServer: (inlineConfig: Record<string, unknown>) => Promise<{
    listen: () => Promise<void>;
    close: () => Promise<void>;
    resolvedUrls: { local: string[]; network: string[] } | null;
    config: { server: { port?: number } };
  }>;
  mergeConfig: (defaults: Record<string, unknown>, overrides: Record<string, unknown>) => Record<string, unknown>;
};

async function loadVite(projectRoot: string): Promise<ViteModule> {
  const viteEntry = path.join(projectRoot, "node_modules", "vite", "dist", "node", "index.js");
  if (!fs.existsSync(viteEntry)) {
    throw new Error("vite not found in project; run npm install / pnpm install");
  }
  return import(pathToFileURL(viteEntry).href) as Promise<ViteModule>;
}

function findViteConfig(projectRoot: string): string | undefined {
  for (const name of ["vite.config.ts", "vite.config.js", "vite.config.mjs"]) {
    const p = path.join(projectRoot, name);
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

function auroboreDevAssetsPlugin(assetsDir: string, webMode?: boolean): Record<string, unknown> {
  const plugin: Record<string, unknown> = {
    name: "aurobore-dev-assets",
    configureServer(server: { middlewares: { use: (fn: ReturnType<typeof bridgeAssetsMiddleware>) => void } }) {
      server.middlewares.use(bridgeAssetsMiddleware(assetsDir));
      server.middlewares.use(appDataMiddleware(assetsDir));
    },
  };

  if (webMode) {
    plugin.transformIndexHtml = {
      order: "pre",
      handler(html: string) {
        return injectAuroboreWebMode(html);
      },
    };
  }

  return plugin;
}

/** Vite dev server с HMR для WebView на эмуляторе или browser mock mode. */
export async function startViteDevServer(options: ViteDevServerOptions): Promise<ViteDevServerResult> {
  const { projectRoot, port, assetsDir, webMode } = options;
  const entryHost = webMode ? "127.0.0.1" : resolveDevHost();
  const vite = await loadVite(projectRoot);

  const inlineConfig: Record<string, unknown> = {
    root: projectRoot,
    configFile: findViteConfig(projectRoot),
    server: {
      host: webMode ? "127.0.0.1" : true,
      port,
      strictPort: true,
      hmr: webMode
        ? { host: "127.0.0.1", port }
        : {
            host: entryHost,
            port,
          },
    },
    plugins: [auroboreDevAssetsPlugin(assetsDir, webMode)],
  };

  const server = await vite.createServer(inlineConfig);
  await server.listen();

  const resolvedPort = server.config.server.port ?? port;
  const entryUrl = `http://${entryHost}:${resolvedPort}/`;

  if (webMode) {
    console.log(`[dev] Vite HMR (browser mock) http://127.0.0.1:${resolvedPort}/`);
  } else {
    console.log(`[dev] Vite HMR http://0.0.0.0:${resolvedPort}/`);
    console.log(`[dev] emulator entry: ${entryUrl}`);
  }

  return {
    port: resolvedPort,
    host: entryHost,
    url: entryUrl,
    stop: async () => {
      await server.close();
    },
  };
}
