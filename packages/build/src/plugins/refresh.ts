import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "../config/parse.js";
import { resolveEffectiveConfig } from "../config/merge.js";
import { resolvePluginManifests } from "../codegen/project.js";
import { runProjectCodegenFromConfig } from "../codegen/project.js";
import {
  generateCMakeLists,
  generateDefaultsJson,
  generateDesktop,
  generateSpec,
} from "../native/generate.js";
import { resolvePluginRefs } from "./catalog.js";

/** Перегенерирует plugin-зависимые native-артефакты без полного rebuild container. */
export function refreshNativePluginArtifacts(projectRoot: string): boolean {
  const nativeDir = path.join(projectRoot, ".aurobore", "native");
  const { config } = loadConfig(projectRoot);
  const refsForCodegen = resolvePluginRefs(config.plugins);

  const isFullNativeProject = fs.existsSync(path.join(nativeDir, "CMakeLists.txt"));

  if (!isFullNativeProject) {
    runProjectCodegenFromConfig(projectRoot, refsForCodegen);
    return false;
  }

  const manifests = resolvePluginManifests(projectRoot, refsForCodegen);
  const effective = resolveEffectiveConfig(config, manifests);
  const appId = effective.app.id;

  let mode: "prod" | "dev" = "prod";
  const metaPath = path.join(projectRoot, ".aurobore", "build-meta.json");
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as { mode?: string };
    if (meta.mode === "dev") mode = "dev";
  }

  runProjectCodegenFromConfig(projectRoot, refsForCodegen);

  fs.mkdirSync(path.join(nativeDir, "rpm"), { recursive: true });
  fs.mkdirSync(path.join(nativeDir, "config"), { recursive: true });
  fs.writeFileSync(path.join(nativeDir, "rpm", `${appId}.spec`), generateSpec(appId, effective), "utf8");
  fs.writeFileSync(path.join(nativeDir, `${appId}.desktop`), generateDesktop(appId, effective), "utf8");
  fs.writeFileSync(
    path.join(nativeDir, "config", "defaults.json"),
    generateDefaultsJson(effective, mode),
    "utf8",
  );
  fs.writeFileSync(
    path.join(nativeDir, "CMakeLists.txt"),
    generateCMakeLists(appId, effective.app.version, manifests),
    "utf8",
  );

  return true;
}
