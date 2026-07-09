/** Mirrors docs/.vitepress/audience.ts — keep in sync when changing human build scope. */
export const DOCS_REPO_URL = "https://github.com/aurobore-platform/aurora";

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
  "dev/README.md",
  "dev/adding-a-plugin.md",
  "dev/native-plugin-guide.md",
  "dev/native-debugging.md",
  "dev/web-debugging.md",
  "dev/e2e-testing.md",
  "dev/webview-improvements-plan.md",
  "dev/webview-improvements-plan-plus.md",
];

export const HUMAN_README_INDEX_DIRS = [
  "tutorials",
  "plugins",
  "api",
  "architecture",
];

export function globToRegExp(glob) {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "§§")
    .replace(/\*/g, "[^/]*")
    .replace(/§§/g, ".*");
  return new RegExp(`^${escaped}$`);
}

const excludePatterns = HUMAN_SRC_EXCLUDE.map(globToRegExp);

export function isHumanExcluded(rel) {
  const normalized = rel.replace(/\\/g, "/");
  return excludePatterns.some((re) => re.test(normalized));
}

export function repoLink(relativePath) {
  const hashIdx = relativePath.indexOf("#");
  const pathPart = hashIdx >= 0 ? relativePath.slice(0, hashIdx) : relativePath;
  const hash = hashIdx >= 0 ? relativePath.slice(hashIdx) : "";
  const last = pathPart.split("/").filter(Boolean).pop() ?? "";
  const isFile = /\.[a-zA-Z0-9]+$/.test(last);
  const kind = isFile ? "blob" : "tree";
  const normalized = pathPart.replace(/\/$/, "");
  return `${DOCS_REPO_URL}/${kind}/main/${normalized}${hash}`;
}
