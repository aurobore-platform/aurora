import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyInitToProject,
  buildInitConfig,
  collectInitDefaults,
  detectPackageManager,
  detectWebRoot,
  removeInitFromProject,
} from "./init.js";

function mkTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-init-"));
}

describe("project init", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  function setupProject(files: Record<string, string> = {}): string {
    const root = mkTempDir();
    tempDirs.push(root);
    for (const [rel, content] of Object.entries(files)) {
      const full = path.join(root, rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, "utf8");
    }
    return root;
  }

  it("detectWebRoot читает outDir из vite.config.ts", () => {
    const root = setupProject({
      "vite.config.ts": `export default { build: { outDir: 'output' } }`,
    });
    expect(detectWebRoot(root)).toBe("output");
  });

  it("detectWebRoot выбирает существующий dist/build/public", () => {
    const root = setupProject({});
    fs.mkdirSync(path.join(root, "build"));
    expect(detectWebRoot(root)).toBe("build");
  });

  it("detectWebRoot для Vite с public/ возвращает dist, не public", () => {
    const root = setupProject({
      "package.json": JSON.stringify({
        name: "vue-demo",
        devDependencies: { vite: "^8.0.0" },
        scripts: { build: "vite build" },
      }),
      "vite.config.ts": "export default {}",
      "public/.gitkeep": "",
    });
    expect(detectWebRoot(root)).toBe("dist");
  });

  it("detectPackageManager по lockfile", () => {
    const root = setupProject({ "pnpm-lock.yaml": "" });
    expect(detectPackageManager(root)).toBe("pnpm");
  });

  it("collectInitDefaults берёт имя и версию из package.json", () => {
    const root = setupProject({
      "package.json": JSON.stringify({
        name: "my-vue-app",
        version: "2.1.0",
        scripts: { build: "vite build" },
      }),
      "dist/index.html": "<html></html>",
    });
    const defaults = collectInitDefaults(root);
    expect(defaults.appId).toBe("ru.example.my_vue_app");
    expect(defaults.appName).toBe("my-vue-app");
    expect(defaults.version).toBe("2.1.0");
    expect(defaults.webRoot).toBe("dist");
    expect(defaults.hasBuildScript).toBe(true);
    expect(defaults.hints.some((h) => h.includes("Vite"))).toBe(false);
  });

  it("buildInitConfig валидирует конфиг", () => {
    const config = buildInitConfig({
      appId: "ru.example.demo",
      appName: "Demo",
      version: "1.0.0",
      webRoot: "dist",
      webEntry: "index.html",
      internet: true,
    });
    expect(config.app.id).toBe("ru.example.demo");
    expect(config.permissions).toEqual(["Internet"]);
  });

  it("applyInitToProject создаёт конфиг и патчит package.json", () => {
    const root = setupProject({
      "package.json": JSON.stringify({ name: "demo", scripts: { build: "vite build" } }, null, 2),
      ".gitignore": "node_modules/\n",
    });

    const result = applyInitToProject(root, {
      appId: "ru.example.demo",
      appName: "Demo",
      version: "1.0.0",
      webRoot: "dist",
      webEntry: "index.html",
      internet: true,
    });

    expect(result.configPath).toBe(path.join(root, "aurobore.config.json"));
    expect(fs.existsSync(result.configPath!)).toBe(true);
    expect(result.packageJsonUpdated).toBe(true);
    expect(result.scriptsAdded).toContain("aurora:build");
    expect(result.scriptsAdded).toContain("build:aurora");
    expect(result.gitignoreUpdated).toBe(true);

    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["aurora:run"]).toBe("aurobore run");

    const gitignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
    expect(gitignore).toContain(".aurobore/");
    expect(gitignore.split("\n").filter((l) => l.trim() === ".aurobore/").length).toBe(1);
  });

  it("collectInitDefaults нормализует 0.0.0 в 1.0.0", () => {
    const root = setupProject({
      "package.json": JSON.stringify({ name: "vue-demo", version: "0.0.0" }),
    });
    expect(collectInitDefaults(root).version).toBe("1.0.0");
  });

  it("applyInitToProject добавляет @aurobore/cli в devDependencies", () => {
    const root = setupProject({
      "package.json": JSON.stringify({ name: "demo", scripts: { build: "vite build" } }, null, 2),
    });

    applyInitToProject(root, {
      appId: "ru.example.demo",
      appName: "Demo",
      version: "1.0.0",
      webRoot: "dist",
      webEntry: "index.html",
      internet: true,
      cliVersion: "0.0.2",
    });

    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as {
      devDependencies: Record<string, string>;
    };
    expect(pkg.devDependencies["@aurobore/cli"]).toBe("^0.0.2");
  });

  it("applyInitToProject отклоняет существующий конфиг без force", () => {
    const root = setupProject({
      "aurobore.config.json": "{}",
      "package.json": JSON.stringify({ name: "demo" }),
    });

    expect(() =>
      applyInitToProject(root, {
        appId: "ru.example.demo",
        appName: "Demo",
        version: "1.0.0",
        webRoot: "dist",
        webEntry: "index.html",
        internet: true,
      }),
    ).toThrow(/already exists/);
  });

  it("applyInitToProject не перезаписывает существующие scripts", () => {
    const root = setupProject({
      "package.json": JSON.stringify({
        name: "demo",
        scripts: { "aurora:build": "custom build" },
      }),
    });

    const result = applyInitToProject(root, {
      appId: "ru.example.demo",
      appName: "Demo",
      version: "1.0.0",
      webRoot: "dist",
      webEntry: "index.html",
      internet: true,
    });

    expect(result.scriptsAdded).not.toContain("aurora:build");
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["aurora:build"]).toBe("custom build");
  });

  it("removeInitFromProject откатывает applyInitToProject", () => {
    const root = setupProject({
      "package.json": JSON.stringify({ name: "demo", scripts: { build: "vite build" } }, null, 2),
      ".gitignore": "node_modules/\n",
    });

    applyInitToProject(root, {
      appId: "ru.example.demo",
      appName: "Demo",
      version: "1.0.0",
      webRoot: "dist",
      webEntry: "index.html",
      internet: true,
      cliVersion: "0.0.2",
    });

    fs.mkdirSync(path.join(root, ".aurobore", "cache"), { recursive: true });

    const result = removeInitFromProject(root);

    expect(result.configRemoved).toBe(path.join(root, "aurobore.config.json"));
    expect(fs.existsSync(path.join(root, "aurobore.config.json"))).toBe(false);
    expect(result.scriptsRemoved).toEqual(
      expect.arrayContaining(["aurora:build", "aurora:run", "build:aurora"]),
    );
    expect(result.cliRemoved).toBe(true);
    expect(result.gitignoreUpdated).toBe(true);
    expect(result.cacheRemoved).toBe(true);

    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(pkg.scripts?.["aurora:build"]).toBeUndefined();
    expect(pkg.devDependencies?.["@aurobore/cli"]).toBeUndefined();
    expect(fs.readFileSync(path.join(root, ".gitignore"), "utf8")).not.toContain(".aurobore/");
    expect(fs.existsSync(path.join(root, ".aurobore"))).toBe(false);
  });

  it("removeInitFromProject не трогает кастомные aurora:* скрипты", () => {
    const root = setupProject({
      "package.json": JSON.stringify({
        name: "demo",
        scripts: { "aurora:build": "custom build", build: "vite build" },
        devDependencies: { "@aurobore/cli": "^0.0.1" },
      }),
      "aurobore.config.json": "{}",
    });

    const result = removeInitFromProject(root);

    expect(result.scriptsRemoved).not.toContain("aurora:build");
    expect(result.cliRemoved).toBe(true);
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts["aurora:build"]).toBe("custom build");
  });
});
