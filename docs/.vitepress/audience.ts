export type DocsAudience = "human" | "full";

export function resolveAudience(): DocsAudience {
  if (process.env.DOCS_AUDIENCE === "full") return "full";
  return "human";
}

export const HUMAN_SRC_EXCLUDE = [
  "**/task.txt",
  "agents/**",
  "checklists.md",
  "dev/**",
  "architecture/**",
  "adr/**",
  "rfc/**",
  "api/plugins/**",
  "vision.md",
  "glossary.md",
  "requirements.md",
  "roadmap.md",
  "mvp-plan.md",
  "repository-structure.md",
  "README.md",
  "aurora/README.md",
  "aurora/sdk-overview.md",
  "aurora/build-and-packaging.md",
  "aurora/tooling.md",
  "aurora/webview.md",
  "aurora/glossary.md",
  "aurora/requirements-and-conventions.md",
  "aurora/verification-status.md",
  "aurora/sources.md",
];

export const FULL_README_INDEX_DIRS = [
  "tutorials",
  "plugins",
  "api",
  "api/plugins",
  "architecture",
  "dev",
  "adr",
  "rfc",
  "aurora",
  "agents",
] as const;

export const HUMAN_README_INDEX_DIRS = ["tutorials", "plugins", "api"] as const;
