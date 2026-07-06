import fs from "node:fs";
import path from "node:path";
import type * as esbuild from "esbuild";
import * as esbuildLib from "esbuild";
import { devAssetsDir } from "./bridgeAssets.js";
import { resolveDevHost, startDevServer } from "./server.js";

const DEV_SERVE_DIR = ".aurobore/dev-serve";

export interface EsbuildDevServerOptions {
  projectRoot: string;
  port: number;
  host?: string;
  entry?: string;
  webMode?: boolean;
  polyfills?: string[] | null;
}

export interface EsbuildDevServerResult {
  port: number;
  host: string;
  url: string;
  stop: () => Promise<void>;
}

function copyDirFiltered(src: string, dst: string): void {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirFiltered(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function prepareServeDir(projectRoot: string): string {
  const serveDir = path.join(projectRoot, DEV_SERVE_DIR);
  if (fs.existsSync(serveDir)) {
    fs.rmSync(serveDir, { recursive: true, force: true });
  }
  const srcDir = path.join(projectRoot, "src");
  copyDirFiltered(srcDir, serveDir);

  const assetsDir = devAssetsDir(projectRoot);
  if (fs.existsSync(path.join(assetsDir, "js"))) {
    copyDirFiltered(path.join(assetsDir, "js"), path.join(serveDir, "js"));
  }
  if (fs.existsSync(path.join(assetsDir, "css"))) {
    copyDirFiltered(path.join(assetsDir, "css"), path.join(serveDir, "css"));
  }

  return serveDir;
}

function liveReloadPlugin(notifyReload: () => void): esbuild.Plugin {
  return {
    name: "aurobore-live-reload",
    setup(build) {
      build.onEnd((result) => {
        if (result.errors.length === 0) {
          notifyReload();
        }
      });
    },
  };
}

/** esbuild watch + static SSE live reload для vanilla TS-проектов. */
export async function startEsbuildDevServer(
  options: EsbuildDevServerOptions,
): Promise<EsbuildDevServerResult> {
  const { projectRoot, port, webMode, polyfills } = options;
  const bindHost = options.host ?? (webMode ? "127.0.0.1" : "0.0.0.0");
  const lanHost = webMode ? "127.0.0.1" : resolveDevHost();
  const entryPoint = options.entry ?? path.join(projectRoot, "src", "ts", "app.ts");
  const serveDir = prepareServeDir(projectRoot);
  const outJs = path.join(serveDir, "js", "app.js");
  const assetsRoot = devAssetsDir(projectRoot);

  const { server, notifyReload } = startDevServer({
    root: serveDir,
    port,
    host: bindHost,
    assetsDir: assetsRoot,
    webMode,
    polyfills,
  });

  const ctx = await esbuildLib.context({
    entryPoints: [entryPoint],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2020",
    outfile: outJs,
    logLevel: "warning",
    plugins: [liveReloadPlugin(notifyReload)],
  });

  const initial = await ctx.rebuild();
  if (initial.errors.length > 0) {
    await ctx.dispose();
    server.close();
    throw new Error("esbuild initial build failed");
  }

  await ctx.watch();

  const entryUrl = `http://${lanHost}:${port}/index.html`;

  if (webMode) {
    console.log(`[dev] esbuild server (browser mock) http://127.0.0.1:${port}/`);
  } else {
    console.log(`[dev] esbuild server http://${bindHost}:${port}/ → ${serveDir}`);
    console.log(`[dev] emulator entry: ${entryUrl}`);
  }

  return {
    port,
    host: lanHost,
    url: entryUrl,
    stop: async () => {
      await ctx.dispose();
      server.close();
    },
  };
}
