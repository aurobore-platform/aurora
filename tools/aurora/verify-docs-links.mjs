#!/usr/bin/env node
/**
 * Verifies internal markdown links in human-audience docs (GitHub Pages build).
 * Fails if a link targets an excluded or missing page, or escapes docs/ without a GitHub URL.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DOCS_REPO_URL,
  HUMAN_README_INDEX_DIRS,
  isHumanExcluded,
} from "./docs-audience.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.join(__dirname, "../../docs");

const LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".md")) files.push(full);
  }
  return files;
}

function candidatePaths(relNoExt) {
  const normalized = relNoExt.replace(/\\/g, "/").replace(/^\//, "");
  const candidates = new Set();

  if (normalized.endsWith("/") || normalized === "") {
    for (const dir of HUMAN_README_INDEX_DIRS) {
      if (normalized === `${dir}/` || normalized === dir) {
        candidates.add(path.join(docsRoot, dir, "README.md"));
      }
    }
  }

  if (normalized.endsWith(".md")) {
    candidates.add(path.join(docsRoot, normalized));
  } else {
    candidates.add(path.join(docsRoot, `${normalized}.md`));
    candidates.add(path.join(docsRoot, normalized, "README.md"));
    candidates.add(path.join(docsRoot, normalized, "index.md"));
  }

  return [...candidates];
}

function resolveInternalTarget(fromFile, href) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:")) return null;

  const trimmed = href.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return "external";
  }

  const pathPart = trimmed.split("#")[0];
  if (!pathPart) return null;

  if (pathPart.startsWith("../../")) {
    return { kind: "repo-escape", raw: href };
  }

  let rel;
  if (pathPart.startsWith("/")) {
    rel = pathPart.slice(1);
  } else {
    rel = path.relative(docsRoot, path.normalize(path.join(path.dirname(fromFile), pathPart)));
  }

  const candidates = candidatePaths(rel);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { kind: "file", path: candidate };
    }
  }

  return { kind: "missing", raw: href, tried: candidates };
}

function checkFile(file) {
  const relFromDocs = path.relative(docsRoot, file).replace(/\\/g, "/");
  const text = fs.readFileSync(file, "utf8");
  const issues = [];

  for (const match of text.matchAll(LINK_RE)) {
    const href = match[2];
    const resolved = resolveInternalTarget(file, href);
    if (!resolved || resolved === "external") continue;

    if (resolved.kind === "repo-escape") {
      issues.push({
        href,
        reason: "repo-relative link escapes docs/ (use GitHub tree/blob URL)",
      });
      continue;
    }

    if (resolved.kind === "missing") {
      issues.push({
        href,
        reason: `target not found (tried ${resolved.tried.map((p) => path.relative(docsRoot, p)).join(", ")})`,
      });
      continue;
    }

    const targetRel = path.relative(docsRoot, resolved.path).replace(/\\/g, "/");
    if (isHumanExcluded(targetRel)) {
      issues.push({
        href,
        reason: `target "${targetRel}" is excluded from human docs build`,
      });
    }
  }

  return issues;
}

function main() {
  const allIssues = [];

  for (const file of walk(docsRoot)) {
    const rel = path.relative(docsRoot, file);
    if (isHumanExcluded(rel)) continue;

    const issues = checkFile(file);
    for (const issue of issues) {
      allIssues.push({ file: rel.replace(/\\/g, "/"), ...issue });
    }
  }

  if (allIssues.length === 0) {
    console.log("[docs:verify-links] OK — no broken links in human-audience docs.");
    return;
  }

  console.error(`[docs:verify-links] ${allIssues.length} broken link(s):\n`);
  for (const { file, href, reason } of allIssues) {
    console.error(`  ${file}`);
    console.error(`    (${href}) — ${reason}\n`);
  }
  console.error(`Internal-only docs: use ${DOCS_REPO_URL}/blob/main/docs/...`);
  process.exit(1);
}

main();
