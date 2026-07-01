import type { ManifestMethod, ManifestTypeRef, PluginManifest } from "../manifest/types.js";

const PRIMITIVE_TS: Record<string, string> = {
  string: "string",
  number: "number",
  boolean: "boolean",
  object: "Record<string, unknown>",
  array: "unknown[]",
  void: "void",
};

export function manifestTypeToTs(ref: ManifestTypeRef | undefined, manifest: PluginManifest): string {
  if (!ref || ref === "void") return "void";
  if (PRIMITIVE_TS[ref]) return PRIMITIVE_TS[ref];
  const fields = manifest.types?.[ref];
  if (!fields) return "unknown";
  const parts = Object.entries(fields).map(([k, t]) => {
    const optional = t.endsWith("?");
    const base = optional ? t.slice(0, -1) : t;
    return `${k}${optional ? "?" : ""}: ${PRIMITIVE_TS[base] ?? "unknown"}`;
  });
  return `{ ${parts.join("; ")} }`;
}

export function methodArgsType(method: ManifestMethod, manifest: PluginManifest): string {
  if (!method.args) return "Record<string, never>";
  if (typeof method.args === "string") return manifestTypeToTs(method.args, manifest);
  const parts = Object.entries(method.args).map(
    ([k, t]) => `${k}${t.endsWith("?") ? "" : "?"}: ${manifestTypeToTs(t, manifest)}`,
  );
  return `{ ${parts.join("; ")} }`;
}

export function generateJsWrapper(manifest: PluginManifest): string {
  const lines: string[] = [
    "// @generated — do not edit",
    `/** @typedef {import('./index.d.ts').${manifest.display}} ${manifest.display}Api */`,
    'import { getAurobore } from "@aurobore/core";',
    "",
    `export const ${manifest.display} = {`,
  ];

  for (const [methodName, method] of Object.entries(manifest.methods)) {
    if (method.stream) {
      lines.push(
        `  ${methodName}(args) {`,
        `    return getAurobore().invoke(${JSON.stringify(manifest.display)}, ${JSON.stringify(methodName)}, args ?? {}, { stream: true });`,
        `  },`,
      );
    } else {
      lines.push(
        `  ${methodName}(args) {`,
        `    return getAurobore().invoke(${JSON.stringify(manifest.display)}, ${JSON.stringify(methodName)}, args ?? {});`,
        `  },`,
      );
    }
  }

  lines.push("};", "");
  return lines.join("\n");
}

export function generateTypes(manifest: PluginManifest): string {
  const lines: string[] = ["// @generated — do not edit", ""];

  if (manifest.types) {
    for (const [typeName, fields] of Object.entries(manifest.types)) {
      const parts = Object.entries(fields).map(([k, t]) => {
        const optional = t.endsWith("?");
        const base = optional ? t.slice(0, -1) : t;
        return `${k}${optional ? "?" : ""}: ${PRIMITIVE_TS[base] ?? "unknown"}`;
      });
      lines.push(`export interface ${typeName} { ${parts.join("; ")} }`, "");
    }
  }

  lines.push(`export interface ${manifest.display}Api {`);
  for (const [methodName, method] of Object.entries(manifest.methods)) {
    const argsType = methodArgsType(method, manifest);
    const resultType = manifestTypeToTs(method.result, manifest);
    if (method.stream) {
      lines.push(
        `  ${methodName}(args?: ${argsType}): Promise<{ subscriptionId: string; onData: (payload: unknown) => void; onError: (error: unknown) => void; onComplete: () => void; stop: () => void }>;`,
      );
    } else if (resultType === "void") {
      lines.push(`  ${methodName}(args?: ${argsType}): Promise<void>;`);
    } else {
      lines.push(`  ${methodName}(args?: ${argsType}): Promise<${resultType}>;`);
    }
  }
  lines.push("}", "");
  return lines.join("\n");
}

export function generateNativeRegistry(manifests: PluginManifest[]): { header: string; source: string } {
  const factoryDecls = manifests.map(
    (m) => `IPlugin *create${m.display}Plugin(BridgeRouter *router);`,
  );

  const descriptors = manifests.map((m) => {
    const methods = Object.keys(m.methods)
      .map((k) => `QStringLiteral("${k}")`)
      .join(", ");
    const events = Object.keys(m.events ?? {})
      .map((k) => `QStringLiteral("${k}")`)
      .join(", ");
    const perms = (m.permissions ?? [])
      .map((p) => `QStringLiteral("${p}")`)
      .join(", ");
    const scopes = (m.scopes ?? [])
      .map((s) => `QStringLiteral("${s}")`)
      .join(", ");
    return `    {
        QStringLiteral("${m.display}"),
        QStringLiteral("${m.name}"),
        QStringLiteral("${m.version}"),
        ${m.engineCompat.bridgeProtocol},
        QStringList({ ${perms} }),
        QStringList({ ${scopes} }),
        QStringList({ ${methods} }),
        QStringList({ ${events} })
    }`;
  });

  const createCases = manifests.map(
    (m) =>
      `    if (display == QStringLiteral("${m.display}"))\n        return create${m.display}Plugin(router);`,
  );

  const header = `#ifndef AUROBORE_PLUGIN_REGISTRY_H
#define AUROBORE_PLUGIN_REGISTRY_H

#include "PluginDescriptor.h"
#include "IPlugin.h"

#include <QList>

class BridgeRouter;

${factoryDecls.join("\n")}

class PluginRegistry
{
public:
    static QList<PluginDescriptor> descriptors();
    static IPlugin *createPlugin(const QString &display, BridgeRouter *router);
};

#endif
`;

  const source = `// @generated — do not edit
#include "PluginRegistry.h"

#include <QtCore/QString>

QList<PluginDescriptor> PluginRegistry::descriptors()
{
    return {
${descriptors.join(",\n")}
    };
}

IPlugin *PluginRegistry::createPlugin(const QString &display, BridgeRouter *router)
{
${createCases.join("\n")}
    return nullptr;
}
`;

  return { header, source };
}

export function generatePluginBundle(manifests: PluginManifest[]): string {
  const lines: string[] = [
    "// @generated — do not edit",
    "(function () {",
    "  if (!globalThis.Aurobore) {",
    '    console.warn("[aurobore-plugins] Aurobore bridge not loaded");',
    "    return;",
    "  }",
    "  var A = globalThis.Aurobore;",
    "  A.__plugins = A.__plugins || {};",
  ];

  for (const manifest of manifests) {
    lines.push(`  A.${manifest.display} = {`);
    for (const [methodName, method] of Object.entries(manifest.methods)) {
      if (method.stream) {
        lines.push(
          `    ${methodName}: function (args) { return A.invoke(${JSON.stringify(manifest.display)}, ${JSON.stringify(methodName)}, args || {}, { stream: true }); },`,
        );
      } else {
        lines.push(
          `    ${methodName}: function (args) { return A.invoke(${JSON.stringify(manifest.display)}, ${JSON.stringify(methodName)}, args || {}); },`,
        );
      }
    }
    const methodNames = Object.keys(manifest.methods);
    const eventNames = Object.keys(manifest.events ?? {});
    lines.push(
      `  };`,
      `  A.__plugins[${JSON.stringify(manifest.display)}] = { version: ${JSON.stringify(manifest.version)}, methods: ${JSON.stringify(methodNames)}, events: ${JSON.stringify(eventNames)} };`,
    );
  }

  lines.push('  console.log("[aurobore-plugins] M3 plugins registered:", Object.keys(A.__plugins));', "})();", "");
  return lines.join("\n");
}
