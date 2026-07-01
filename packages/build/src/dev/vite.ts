import fs from "node:fs";
import path from "node:path";
import { bridgeAssetsMiddleware, resolveProjectModuleUrl } from "./bridgeAssets.js";
import { resolveDevHost } from "./server.js";

export interface ViteDevServerOptions {
  projectRoot: string;
  port: number;
  assetsDir: string;
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
  return import(resolveProjectModuleUrl(projectRoot, "vite/dist/node/index.js")) as Promise<ViteModule>;
}

function auroboreDevAssetsPlugin(assetsDir: string): Record<string, unknown> {
  return {
    name: "aurobore-dev-assets",
    configureServer(server: { middlewares: { use: (fn: ReturnType<typeof bridgeAssetsMiddleware>) => void } }) {
      server.middlewares.use(bridgeAssetsMiddleware(assetsDir));
    },
  };
}

/** Vite dev server с HMR для WebView на эмуляторе. */
export async function startViteDevServer(options: ViteDevServerOptions): Promise<ViteDevServerResult> {
  const { projectRoot, port, assetsDir } = options;
  const lanHost = resolveDevHost();
  const vite = await loadVite(projectRoot);

  const inlineConfig: Record<string, unknown> = {
    root: projectRoot,
    configFile: findViteConfig(projectRoot),
    server: {
      host: true,
      port,
      strictPort: true,
      hmr: {
        host: lanHost,
        port,
      },
    },
    plugins: [auroboreDevAssetsPlugin(assetsDir)],
  };

  const server = await vite.createServer(inlineConfig);
  await server.listen();

  const resolvedPort = server.config.server.port ?? port;
  const entryUrl = `http://${lanHost}:${resolvedPort}/`;

  console.log(`[dev] Vite HMR http://0.0.0.0:${resolvedPort}/`);
  console.log(`[dev] emulator entry: ${entryUrl}`);

  return {
    port: resolvedPort,
    host: lanHost,
    url: entryUrl,
    stop: async () => {
      await server.close();
    },
  };
}

function findViteConfig(projectRoot: string): string | undefined {
  for (const name of ["vite.config.ts", "vite.config.js", "vite.config.mjs"]) {
    const p = path.join(projectRoot, name);
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}
