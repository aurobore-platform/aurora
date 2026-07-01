import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { resolveRuntimeRoot } from "./runtimePaths.js";

/** Стандартные размеры иконок Аврора (ApplicationTemplate). */
export const AURORA_ICON_SIZES = [86, 108, 128, 172] as const;

export type AuroraIconSize = (typeof AURORA_ICON_SIZES)[number];

export interface ResolvedAppIcons {
  /** Map size → absolute path to PNG (temp or source). */
  bySize: Record<AuroraIconSize, string>;
  source: "presized" | "master" | "placeholder";
}

function sizeDir(size: AuroraIconSize): string {
  return `${size}x${size}`;
}

function iconFileName(appId: string): string {
  return `${appId}.png`;
}

function presizedIconPath(projectRoot: string, size: AuroraIconSize, appId: string): string {
  const file = iconFileName(appId);
  const candidates = [
    path.join(projectRoot, "resources", "icons", sizeDir(size), file),
    path.join(projectRoot, "icons", sizeDir(size), file),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0]!;
}

function allPresizedExist(projectRoot: string, appId: string): boolean {
  return AURORA_ICON_SIZES.every((size) => fs.existsSync(presizedIconPath(projectRoot, size, appId)));
}

function resolveMasterPath(projectRoot: string, appIcon?: string): string | null {
  if (!appIcon) {
    return null;
  }
  const resolved = path.isAbsolute(appIcon) ? appIcon : path.join(projectRoot, appIcon);
  return fs.existsSync(resolved) ? resolved : null;
}

function resolvePlaceholderSvg(runtimeRoot?: string, projectRoot?: string): string {
  const runtime = resolveRuntimeRoot({ projectRoot });
  const svg = path.join(runtime, "container", "icons", "placeholder.svg");
  if (fs.existsSync(svg)) {
    return svg;
  }
  throw new Error(
    `Default icon placeholder not found: ${svg}. Reinstall @aurobore/runtime or set app.icon in aurobore.config.`,
  );
}

async function resizeToPng(
  sourcePath: string,
  size: AuroraIconSize,
  destPath: string,
): Promise<void> {
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  const input = fs.readFileSync(sourcePath);
  await sharp(input, { density: 300 })
    .resize(size, size, { fit: "contain", background: { r: 26, g: 26, b: 46, alpha: 1 } })
    .png()
    .toFile(destPath);
}

/**
 * Разрешает четыре PNG иконки для appId: готовые PNG, ресайз из app.icon или placeholder.
 */
export async function resolveAppIcons(options: {
  projectRoot: string;
  appId: string;
  appIcon?: string;
  stagingDir: string;
  runtimeRoot?: string;
}): Promise<ResolvedAppIcons> {
  const { projectRoot, appId, appIcon, stagingDir } = options;
  const outDir = path.join(stagingDir, "resolved-icons");
  fs.mkdirSync(outDir, { recursive: true });

  if (allPresizedExist(projectRoot, appId)) {
    const bySize = {} as Record<AuroraIconSize, string>;
    for (const size of AURORA_ICON_SIZES) {
      bySize[size] = presizedIconPath(projectRoot, size, appId);
    }
    return { bySize, source: "presized" };
  }

  const master = resolveMasterPath(projectRoot, appIcon);
  const sourcePath = master ?? resolvePlaceholderSvg(options.runtimeRoot, projectRoot);
  const source: ResolvedAppIcons["source"] = master ? "master" : "placeholder";

  const bySize = {} as Record<AuroraIconSize, string>;
  for (const size of AURORA_ICON_SIZES) {
    const dest = path.join(outDir, sizeDir(size), iconFileName(appId));
    await resizeToPng(sourcePath, size, dest);
    bySize[size] = dest;
  }

  return { bySize, source };
}

/** Копирует разрешённые иконки в icons/<size>/<appId>.png внутри native-проекта. */
export function materializeIcons(
  nativeDir: string,
  appId: string,
  resolved: ResolvedAppIcons,
): void {
  for (const size of AURORA_ICON_SIZES) {
    const dest = path.join(nativeDir, "icons", sizeDir(size), iconFileName(appId));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(resolved.bySize[size], dest);
  }
}

export interface IconCheckResult {
  ok: boolean;
  detail: string;
  level: "ok" | "warn";
}

/** Проверка наличия иконок в проекте (для doctor). */
export function checkProjectIcons(projectRoot: string, appId: string, appIcon?: string): IconCheckResult {
  if (allPresizedExist(projectRoot, appId)) {
    return {
      ok: true,
      level: "ok",
      detail: `presized PNG in resources/icons/ or icons/ (${AURORA_ICON_SIZES.map((s) => `${s}x${s}`).join(", ")})`,
    };
  }
  const master = resolveMasterPath(projectRoot, appIcon);
  if (master) {
    return { ok: true, level: "ok", detail: `app.icon: ${appIcon}` };
  }
  return {
    ok: true,
    level: "warn",
    detail:
      "no custom icon; build will use default placeholder (set app.icon or add resources/icons/<size>x<size>/<app.id>.png)",
  };
}
