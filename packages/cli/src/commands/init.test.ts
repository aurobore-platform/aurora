import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runInitCommand } from "./init.js";
import { parseArgs } from "../args.js";

describe("init CLI", () => {
  const tempDirs: string[] = [];
  let originalCwd: string;

  afterEach(() => {
    process.chdir(originalCwd);
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("runInitCommand -y создаёт конфиг и скрипты", async () => {
    originalCwd = process.cwd();
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-init-cli-"));
    tempDirs.push(root);

    fs.writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({ name: "demo-vue", scripts: { build: "vite build" } }, null, 2),
    );
    fs.mkdirSync(path.join(root, "dist"));

    process.chdir(root);
    const code = await runInitCommand(
      parseArgs(["-y", "--id", "ru.example.demo_vue", "--name", "Demo Vue"]),
    );

    expect(code).toBe(0);
    expect(fs.existsSync(path.join(root, "aurobore.config.json"))).toBe(true);
    const config = JSON.parse(fs.readFileSync(path.join(root, "aurobore.config.json"), "utf8")) as {
      app: { icon?: string };
    };
    expect(config.app.icon).toBe("resources/icon.svg");
    expect(fs.existsSync(path.join(root, "resources", "icon.svg"))).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.scripts["aurora:build"]).toBe("aurobore build");
    expect(pkg.scripts["build:aurora"]).toContain("aurobore build");
    expect(pkg.devDependencies?.["@aurobore/cli"]).toBe("^0.0.2");
  });
});
