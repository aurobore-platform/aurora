import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { findMonorepoRoot } from "../codegen/project.js";

const require = createRequire(import.meta.url);

export interface ResolveRuntimeRootOptions {
  /** Repo root or path whose `runtime/container` exists. */
  explicit?: string;
  projectRoot?: string;
}

function isRuntimeRoot(dir: string): boolean {
  return fs.existsSync(path.join(dir, "container"));
}

/** Resolves @aurobore/runtime package root when installed via npm. */
export function resolveBundledRuntimeRoot(): string | null {
  try {
    const pkgJson = require.resolve("@aurobore/runtime/package.json");
    const root = path.dirname(pkgJson);
    return isRuntimeRoot(root) ? root : null;
  } catch {
    return null;
  }
}

/** Resolves native plugin source directory for SFDK staging. */
export function resolvePluginNativeDir(projectRoot: string, pluginName: string): string | null {
  const localDir = path.join(projectRoot, "plugins", pluginName);
  if (fs.existsSync(path.join(localDir, "native"))) {
    return localDir;
  }

  const npmDir = path.join(projectRoot, "node_modules", "@aurobore", pluginName);
  if (fs.existsSync(path.join(npmDir, "native"))) {
    return npmDir;
  }

  const pluginsRoot = process.env.AUROBORE_PLUGINS_ROOT;
  if (pluginsRoot) {
    const envDir = path.join(pluginsRoot, pluginName);
    if (fs.existsSync(path.join(envDir, "native"))) {
      return envDir;
    }
  }

  const monorepoRoot = findMonorepoRoot(projectRoot) ?? findMonorepoRoot();
  if (monorepoRoot) {
    const monorepoDir = path.join(monorepoRoot, "plugins", pluginName);
    if (fs.existsSync(path.join(monorepoDir, "native"))) {
      return monorepoDir;
    }
  }

  return null;
}

/** Root of runtime SDK (container + siblings). */
export function resolveRuntimeRoot(options?: ResolveRuntimeRootOptions | string): string {
  const opts: ResolveRuntimeRootOptions =
    typeof options === "string" ? { explicit: options } : (options ?? {});

  if (opts.explicit && fs.existsSync(path.join(opts.explicit, "runtime", "container"))) {
    return path.join(opts.explicit, "runtime");
  }
  if (opts.explicit && isRuntimeRoot(opts.explicit)) {
    return opts.explicit;
  }

  const monorepo =
    (opts.projectRoot ? findMonorepoRoot(opts.projectRoot) : null) ?? findMonorepoRoot();
  if (monorepo) {
    return path.join(monorepo, "runtime");
  }

  const bundled = resolveBundledRuntimeRoot();
  if (bundled) {
    return bundled;
  }

  if (process.env.AUROBORE_RUNTIME_ROOT && isRuntimeRoot(process.env.AUROBORE_RUNTIME_ROOT)) {
    return process.env.AUROBORE_RUNTIME_ROOT;
  }

  throw new Error(
    "Aurobore runtime not found. Install @aurobore/cli (includes @aurobore/runtime) or set AUROBORE_RUNTIME_ROOT.",
  );
}
