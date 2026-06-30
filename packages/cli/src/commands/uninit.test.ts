import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { applyInitToProject } from "@aurobore/build";
import { runUninitCommand } from "./uninit.js";

function mkTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-uninit-cli-"));
}

describe("aurobore uninit command", () => {
  const tempDirs: string[] = [];
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("откатывает init с флагом -y", async () => {
    const root = mkTempDir();
    tempDirs.push(root);
    process.chdir(root);

    fs.writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo", scripts: { build: "vite build" } }, null, 2),
    );

    applyInitToProject(root, {
      appId: "ru.example.demo",
      appName: "Demo",
      version: "1.0.0",
      webRoot: "dist",
      webEntry: "index.html",
      internet: true,
      cliVersion: "0.0.2",
    });

    const code = await runUninitCommand({ flags: { y: true }, positional: [] });
    expect(code).toBe(0);
    expect(fs.existsSync(path.join(root, "aurobore.config.json"))).toBe(false);
  });
});
