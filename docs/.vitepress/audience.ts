export type DocsAudience = "human" | "full";

/** Base URL for GitHub links in human-facing docs (ADR, requirements, repo paths). */
export const DOCS_REPO_URL = "https://github.com/aurobore-platform/aurora";

export function resolveAudience(): DocsAudience {
  if (process.env.DOCS_AUDIENCE === "full") return "full";
  return "human";
}

export const HUMAN_SRC_EXCLUDE = [
  "**/task.txt",
  "agents/**",
  "checklists.md",
  "adr/**",
  "rfc/**",
  "api/plugins/**",
  "vision.md",
  "glossary.md",
  "requirements.md",
  "roadmap.md",
  "mvp-plan.md",
  "repository-structure.md",
  "alpha-plan.md",
  "alpha-plugins-plan.md",
  "improvements-plan.md",
  "README.md",
  "aurora/README.md",
  "aurora/glossary.md",
  "aurora/requirements-and-conventions.md",
  "aurora/sources.md",
  // Internal dev guides (public: web-mock-mode, w3c-polyfills, ota-updates)
  "dev/README.md",
  "dev/adding-a-plugin.md",
  "dev/native-plugin-guide.md",
  "dev/native-debugging.md",
  "dev/web-debugging.md",
  "dev/e2e-testing.md",
  "dev/webview-improvements-plan.md",
  "dev/webview-improvements-plan-plus.md",
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

export const HUMAN_README_INDEX_DIRS = [
  "tutorials",
  "plugins",
  "api",
  "architecture",
] as const;
