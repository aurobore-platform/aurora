import fs from "node:fs";
import path from "node:path";
import { findMonorepoRoot } from "../codegen/project.js";
import { generateJsWrapper, generateTypes } from "../codegen/generate.js";
import { parseManifest } from "../manifest/parse.js";
import { resolveTemplateDir } from "../dev/server.js";
import {
  BUILTIN_PLUGINS,
  isBuiltinPlugin,
  normalizePluginName,
} from "./catalog.js";

export interface CreatePluginOptions {
  display?: string;
  force?: boolean;
}

export interface CreatePluginResult {
  pluginDir: string;
  name: string;
  display: string;
  monorepoPatched: boolean;
  nextSteps: string[];
}

const PLUGIN_NAME_RE = /^[a-z][a-z0-9-]*$/;

export function toDisplayName(name: string): string {
  return name
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function toPascalCase(name: string): string {
  return toDisplayName(name);
}

export function toErrorCode(name: string): string {
  return `${name.replace(/-/g, "_").toUpperCase()}_UNAVAILABLE`;
}

function validatePluginName(name: string): string {
  const short = normalizePluginName(name);
  if (!PLUGIN_NAME_RE.test(short)) {
    throw new Error(`invalid plugin name "${short}" (use lowercase a-z, digits, hyphens)`);
  }
  if (isBuiltinPlugin(short)) {
    throw new Error(`plugin "${short}" is a built-in plugin (${BUILTIN_PLUGINS.join(", ")})`);
  }
  return short;
}

function writeFromTemplate(
  templatePath: string,
  outPath: string,
  vars: Record<string, string>,
): void {
  let content = fs.readFileSync(templatePath, "utf8");
  for (const [key, value] of Object.entries(vars)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, "utf8");
}

function runPluginCodegen(pluginDir: string, manifestPath: string): void {
  const manifest = parseManifest(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
  const generatedDir = path.join(pluginDir, "generated");
  fs.mkdirSync(generatedDir, { recursive: true });
  fs.writeFileSync(path.join(generatedDir, "index.js"), generateJsWrapper(manifest), "utf8");
  fs.writeFileSync(path.join(generatedDir, "index.d.ts"), generateTypes(manifest), "utf8");
}

function patchCodegenPluginsScript(monorepoRoot: string, pluginName: string): boolean {
  const scriptPath = path.join(monorepoRoot, "packages", "build", "scripts", "codegen-plugins.mjs");
  if (!fs.existsSync(scriptPath)) return false;

  let content = fs.readFileSync(scriptPath, "utf8");
  if (content.includes(`"${pluginName}"`)) return false;

  const marker = "];\n\nfunction readManifest";
  const insert = `  "${pluginName}",\n];\n\nfunction readManifest`;
  if (!content.includes(marker)) {
    throw new Error(`cannot patch PLUGIN_NAMES in ${scriptPath}`);
  }
  content = content.replace(marker, insert);
  fs.writeFileSync(scriptPath, content, "utf8");
  return true;
}

function patchContainerCmake(monorepoRoot: string, display: string, pluginName: string): boolean {
  const cmakePath = path.join(monorepoRoot, "runtime", "container", "CMakeLists.txt");
  if (!fs.existsSync(cmakePath)) return false;

  const cppLine = `    \${PLUGIN_NATIVE_DIR}/${pluginName}/native/${display}Plugin.cpp`;
  const includeLine = `    \${PLUGIN_NATIVE_DIR}/${pluginName}/native`;

  let content = fs.readFileSync(cmakePath, "utf8");
  if (content.includes(cppLine)) return false;

  const cppAnchor = "    ${PLUGIN_NATIVE_DIR}/sensors/native/SensorsPlugin.cpp";
  if (!content.includes(cppAnchor)) {
    throw new Error(`cannot patch CMakeLists.txt — anchor not found`);
  }
  content = content.replace(cppAnchor, `${cppAnchor}\n${cppLine}`);

  const includeAnchor = "    ${PLUGIN_NATIVE_DIR}/sensors/native";
  if (!content.includes(includeAnchor)) {
    throw new Error(`cannot patch CMakeLists include — anchor not found`);
  }
  content = content.replace(includeAnchor, `${includeAnchor}\n${includeLine}`);

  fs.writeFileSync(cmakePath, content, "utf8");
  return true;
}

/** Генерирует скелет плагина в ./plugins/<name>/ относительно cwd. */
export function createPluginScaffold(
  cwd: string,
  rawName: string,
  options: CreatePluginOptions = {},
): CreatePluginResult {
  const name = validatePluginName(rawName);
  const display = options.display?.trim() || toDisplayName(name);
  const pascal = toPascalCase(name);
  const pluginDir = path.join(cwd, "plugins", name);

  if (fs.existsSync(pluginDir) && !options.force) {
    throw new Error(`plugin directory already exists: ${pluginDir} (use --force to overwrite)`);
  }

  if (options.force && fs.existsSync(pluginDir)) {
    fs.rmSync(pluginDir, { recursive: true, force: true });
  }

  const vars: Record<string, string> = {
    name,
    display,
    DISPLAY: pascal,
    DISPLAY_UPPER: pascal.toUpperCase(),
    ERROR_CODE: toErrorCode(name),
  };

  const templateDir = resolveTemplateDir("plugin");

  for (const fileName of ["plugin.manifest", "package.json", "README.md"]) {
    writeFromTemplate(
      path.join(templateDir, fileName),
      path.join(pluginDir, fileName),
      vars,
    );
  }
  writeFromTemplate(
    path.join(templateDir, "native", "Plugin.h.tpl"),
    path.join(pluginDir, "native", `${pascal}Plugin.h`),
    vars,
  );
  writeFromTemplate(
    path.join(templateDir, "native", "Plugin.cpp.tpl"),
    path.join(pluginDir, "native", `${pascal}Plugin.cpp`),
    vars,
  );

  runPluginCodegen(pluginDir, path.join(pluginDir, "plugin.manifest"));

  const monorepoRoot = findMonorepoRoot(cwd);
  let monorepoPatched = false;
  const nextSteps: string[] = [
    `Edit plugin.manifest and native/${pascal}Plugin.cpp`,
    "Run `aurobore generate` in an app project that uses this plugin",
  ];

  if (monorepoRoot) {
    const patchedNames = patchCodegenPluginsScript(monorepoRoot, name);
    const patchedCmake = patchContainerCmake(monorepoRoot, pascal, name);
    monorepoPatched = patchedNames || patchedCmake;
    if (monorepoPatched) {
      nextSteps.push("Run `pnpm codegen:plugins` and `pnpm container:build` in monorepo");
    }
  } else {
    nextSteps.push(
      `Add "@aurobore/${name}": "file:./plugins/${name}" to package.json`,
      `Run \`aurobore plugin add ${name}\``,
    );
  }

  return { pluginDir, name, display, monorepoPatched, nextSteps };
}
