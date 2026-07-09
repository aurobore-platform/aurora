import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { resolveRuntimeRoot } from "./runtimePaths.js";

/** Стандартные размеры иконок Аврора (ApplicationTemplate). */
export const AURORA_ICON_SIZES = [86, 108, 128, 172] as const;

export type AuroraIconSize = (typeof AURORA_ICON_SIZES)[number];

const UI_KIT_ICON_DOC = "https://developer.auroraos.ru/doc/ui_kit";

export interface ResolvedAppIcons {
  /** Map size → absolute path to PNG (temp or source). */
  bySize: Record<AuroraIconSize, string>;
  source: "presized" | "master" | "placeholder";
}

export interface IconCheckResult {
  ok: boolean;
  detail: string;
  level: "ok" | "warn";
  hints?: string[];
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

/** Эвристика: контент до краёв → рекомендовать IconMode=Crop. */
async function suggestIconMode(imagePath: string): Promise<"Crop" | null> {
  try {
    const { data, info } = await sharp(imagePath)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (!info.width || !info.height) {
      return null;
    }
    const channels = info.channels;
    const isTransparent = (x: number, y: number): boolean => {
      const idx = (y * info.width! + x) * channels;
      return data[idx + channels - 1]! < 16;
    };
    const margin = Math.max(2, Math.floor(Math.min(info.width, info.height) * 0.05));
    let transparentEdge = 0;
    let edgeSamples = 0;
    for (let x = 0; x < info.width; x++) {
      for (let y = 0; y < info.height; y++) {
        if (x < margin || y < margin || x >= info.width - margin || y >= info.height - margin) {
          edgeSamples++;
          if (isTransparent(x, y)) {
            transparentEdge++;
          }
        }
      }
    }
    if (edgeSamples === 0) {
      return null;
    }
    const transparentRatio = transparentEdge / edgeSamples;
    return transparentRatio < 0.05 ? "Crop" : null;
  } catch {
    return null;
  }
}

async function collectIconHints(projectRoot: string, appId: string, appIcon?: string): Promise<string[]> {
  const hints: string[] = [];

  if (allPresizedExist(projectRoot, appId)) {
    for (const size of AURORA_ICON_SIZES) {
      const file = presizedIconPath(projectRoot, size, appId);
      const meta = await sharp(file).metadata();
      if (meta.width !== size || meta.height !== size) {
        hints.push(`${size}x${size} PNG has wrong dimensions (${meta.width}x${meta.height})`);
      }
    }
    const sample = presizedIconPath(projectRoot, 172, appId);
    const mode = await suggestIconMode(sample);
    if (mode) {
      hints.push(`consider app.iconMode="${mode}" for edge-to-edge launcher icon (UI Kit)`);
    }
    return hints;
  }

  const master = resolveMasterPath(projectRoot, appIcon);
  if (master) {
    const meta = await sharp(master).metadata();
    if (meta.width && meta.height && meta.width !== meta.height) {
      hints.push("app.icon master should be square");
    }
    if (meta.width && meta.width < 172) {
      hints.push("app.icon master < 172px — use ≥172×172 for store quality");
    }
    const mode = await suggestIconMode(master);
    if (mode) {
      hints.push(`consider app.iconMode="${mode}" for edge-to-edge launcher icon (UI Kit)`);
    }
    return hints;
  }

  hints.push(`no custom icon — set app.icon (see UI Kit: ${UI_KIT_ICON_DOC})`);
  return hints;
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
    hints: [`UI Kit icons: ${UI_KIT_ICON_DOC}`],
  };
}

/** Расширенная проверка иконок (размеры, placeholder, IconMode). */
export async function inspectProjectIcons(
  projectRoot: string,
  appId: string,
  appIcon?: string,
): Promise<IconCheckResult> {
  const base = checkProjectIcons(projectRoot, appId, appIcon);
  const hints = await collectIconHints(projectRoot, appId, appIcon);
  const mergedHints = [...(base.hints ?? []), ...hints];
  if (mergedHints.length === 0) {
    return base;
  }
  const hasPlaceholder = hints.some((h) => h.startsWith("no custom icon"));
  return {
    ok: base.ok,
    level: hasPlaceholder || mergedHints.some((h) => h.includes("wrong dimensions")) ? "warn" : base.level,
    detail: base.detail,
    hints: mergedHints,
  };
}
