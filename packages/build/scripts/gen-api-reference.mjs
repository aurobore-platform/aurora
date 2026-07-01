import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findMonorepoRoot } from "../dist/codegen/project.js";
import { parseManifest } from "../dist/manifest/parse.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = findMonorepoRoot(path.join(__dirname, "..")) ?? path.resolve(__dirname, "../../..");
const OUT_DIR = path.join(REPO_ROOT, "docs", "api", "plugins");

/** Плагины MVP + Echo + расширение A3 (порядок регистрации). */
const PLUGIN_NAMES = [
  "echo",
  "device",
  "storage",
  "filesystem",
  "clipboard",
  "network",
  "camera",
  "geolocation",
  "notifications",
  "share",
  "sensors",
];

function readManifest(pluginName) {
  const manifestPath = path.join(REPO_ROOT, "plugins", pluginName, "plugin.manifest");
  return parseManifest(JSON.parse(fs.readFileSync(manifestPath, "utf8")));
}

function formatArgs(args) {
  if (args == null) return "`{}`";
  if (typeof args === "string") return `\`${args}\``;
  const entries = Object.entries(args);
  if (entries.length === 0) return "`{}`";
  const inner = entries.map(([k, v]) => `${k}: ${v}`).join("; ");
  return `\`{ ${inner} }\``;
}

function formatResult(method) {
  if (method.stream) return "stream";
  if (method.result == null || method.result === "void") return "—";
  return `\`${method.result}\``;
}

function formatPermissions(manifest) {
  const parts = [];
  if (manifest.permissions?.length) {
    parts.push(manifest.permissions.join(", "));
  } else {
    parts.push("нет");
  }
  if (manifest.scopes?.length) {
    parts.push(`scope: \`${manifest.scopes.join("`, `")}\``);
  }
  return parts.join("; ");
}

function renderTypes(manifest) {
  const types = manifest.types ?? {};
  const names = Object.keys(types);
  if (names.length === 0) return "";

  const sections = names.map((typeName) => {
    const fields = types[typeName];
    const rows = Object.entries(fields)
      .map(([field, type]) => `| \`${field}\` | \`${type}\` |`)
      .join("\n");
    return `### \`${typeName}\`\n\n| Поле | Тип |\n|------|-----|\n${rows}`;
  });

  return `\n## Типы\n\n${sections.join("\n\n")}`;
}

function renderMethods(manifest) {
  const rows = Object.entries(manifest.methods).map(([name, method]) => {
    return `| \`${name}\` | ${formatArgs(method.args)} | ${formatResult(method)} | — |`;
  });
  return `## Методы\n\n| Метод | Аргументы | Результат | Описание |\n|-------|-----------|-----------|----------|\n${rows.join("\n")}`;
}

function renderEvents(manifest) {
  const events = manifest.events ?? {};
  const names = Object.keys(events);
  if (names.length === 0) return "";

  const rows = names
    .map((name) => {
      const fields = Object.entries(events[name])
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
      return `| \`${name}\` | \`{ ${fields} }\` | — |`;
    })
    .join("\n");

  return `\n## События\n\n| Событие | Payload | Описание |\n|---------|---------|----------|\n${rows}`;
}

function renderErrors(manifest) {
  const errors = manifest.errors ?? {};
  const codes = Object.keys(errors);
  if (codes.length === 0) return "";

  const rows = codes
    .map((code) => {
      const err = errors[code];
      const when = err.description ?? "—";
      return `| \`${code}\` | ${err.message} | ${when} |`;
    })
    .join("\n");

  return `\n## Коды ошибок\n\n| Код | Сообщение | Когда |\n|-----|-----------|-------|\n${rows}`;
}

function renderPluginDoc(manifest) {
  const pkg = `@aurobore/${manifest.name}`;
  const title = manifest.display || manifest.name;

  return `<!-- AUTO-GENERATED from plugins/${manifest.name}/plugin.manifest — do not edit by hand -->

# ${title}

> Сгенерировано из \`plugin.manifest\`. Ручной справочник: [plugins/${manifest.name}.md](../../plugins/${manifest.name}.md).

**Пакет:** \`${pkg}\`  
**Разрешения:** ${formatPermissions(manifest)}

${renderMethods(manifest)}
${renderTypes(manifest)}
${renderEvents(manifest)}
${renderErrors(manifest)}
## Импорт

\`\`\`typescript
import { ${manifest.display} } from "${pkg}";
\`\`\`
`;
}

function renderIndex(manifests) {
  const rows = manifests
    .map((m) => {
      const perms = m.permissions?.length
        ? m.permissions.join(", ")
        : m.scopes?.length
          ? `scope: ${m.scopes.join(", ")}`
          : "—";
      return `| ${m.display} | \`@aurobore/${m.name}\` | ${perms} | [${m.name}.md](${m.name}.md) |`;
    })
    .join("\n");

  return `<!-- AUTO-GENERATED — do not edit by hand -->

# Plugin API (generated)

Автогенерируемый справочник из \`plugins/*/plugin.manifest\`. Обновление: \`pnpm gen-api-reference\`.

> Ручной справочник с примерами: [plugins/README.md](../../plugins/README.md).

## Каталог

| Плагин | Пакет | Разрешения | Reference |
|--------|-------|------------|-----------|
${rows}
`;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const manifests = PLUGIN_NAMES.map(readManifest);

for (const manifest of manifests) {
  const outPath = path.join(OUT_DIR, `${manifest.name}.md`);
  fs.writeFileSync(outPath, renderPluginDoc(manifest), "utf8");
}

fs.writeFileSync(path.join(OUT_DIR, "README.md"), renderIndex(manifests), "utf8");

console.log(`[gen-api-reference] ${manifests.length} plugin pages → docs/api/plugins/`);
