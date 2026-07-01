/**
 * Generates container .ts translation files. Run after changing translations.ts template.
 * node packages/build/scripts/gen-container-translations.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { materializeTranslations } from "../dist/native/translations.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const containerDir = path.resolve(__dirname, "../../../runtime/container");
const APP_ID = "ru.auroraos.aurobore-container";
const APP_NAME = "Aurobore Container";

materializeTranslations(containerDir, APP_ID, APP_NAME);
console.log(`[gen-container-translations] ${APP_ID} → ${path.join(containerDir, "translations")}`);
