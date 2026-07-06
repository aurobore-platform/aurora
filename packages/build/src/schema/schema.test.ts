import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateConfig } from "../config/parse.js";
import { parseManifest } from "../manifest/parse.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const SCHEMA_DIR = path.join(__dirname, "../../schema");

describe("JSON Schema artifacts (FR-D5)", () => {
  it("config and plugin manifest schema files exist and parse as JSON", () => {
    const configSchema = path.join(SCHEMA_DIR, "aurobore.config.schema.json");
    const manifestSchema = path.join(SCHEMA_DIR, "plugin.manifest.schema.json");
    expect(fs.existsSync(configSchema)).toBe(true);
    expect(fs.existsSync(manifestSchema)).toBe(true);
    expect(JSON.parse(fs.readFileSync(configSchema, "utf8")).$id).toContain("aurobore.config");
    expect(JSON.parse(fs.readFileSync(manifestSchema, "utf8")).$id).toContain("plugin.manifest");
  });

  it("vanilla template config passes validateConfig", () => {
    const configPath = path.join(REPO_ROOT, "templates/vanilla/aurobore.config.json");
    const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const errors = validateConfig(raw);
    expect(errors).toEqual([]);
  });

  it("echo plugin.manifest passes parseManifest", () => {
    const manifestPath = path.join(REPO_ROOT, "plugins/echo/plugin.manifest");
    const raw = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    expect(() => parseManifest(raw)).not.toThrow();
  });
});
