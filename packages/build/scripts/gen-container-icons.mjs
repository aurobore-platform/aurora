/**
 * Generates container placeholder PNGs for all Aurora icon sizes.
 * Run: node packages/build/scripts/gen-container-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const CONTAINER_ICONS = path.join(REPO_ROOT, "runtime/container/icons");
const APP_ID = "ru.auroraos.aurobore-container";
const SIZES = [86, 108, 128, 172];
const SVG = path.join(CONTAINER_ICONS, "placeholder.svg");

if (!fs.existsSync(SVG)) {
  console.error(`Missing ${SVG}`);
  process.exit(1);
}

const input = fs.readFileSync(SVG);
for (const size of SIZES) {
  const dir = path.join(CONTAINER_ICONS, `${size}x${size}`);
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `${APP_ID}.png`);
  await sharp(input, { density: 300 })
    .resize(size, size, { fit: "contain", background: { r: 26, g: 26, b: 46, alpha: 1 } })
    .png()
    .toFile(dest);
  console.log(`[gen-container-icons] ${dest}`);
}
