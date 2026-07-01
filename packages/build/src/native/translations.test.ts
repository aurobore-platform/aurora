import { describe, expect, it } from "vitest";
import {
  generateTsContent,
  materializeTranslations,
  NATIVE_APP_NAME_SOURCE,
} from "./translations.js";
import { generateCMakeLists, generateSpec } from "./generate.js";
import { resolveEffectiveConfig } from "../config/merge.js";
import type { AuroboreConfig } from "../config/types.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("translations", () => {
  it("generateTsContent содержит имя приложения и qsTr-источник", () => {
    const ts = generateTsContent({
      appName: "Demo App",
      language: "ru",
    });
    expect(ts).toContain(NATIVE_APP_NAME_SOURCE);
    expect(ts).toContain("<translation>Demo App</translation>");
    expect(ts).toContain('language="ru"');
    expect(ts).toContain("SplashScreen.qml");
    expect(ts).toContain("DefaultCover.qml");
  });

  it("materializeTranslations создаёт базовый и -ru.ts", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aurobore-ts-"));
    materializeTranslations(dir, "ru.example.app", "My App");
    expect(fs.existsSync(path.join(dir, "translations", "ru.example.app.ts"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "translations", "ru.example.app-ru.ts"))).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("generateCMakeLists и generateSpec включают переводы", () => {
    const config: AuroboreConfig = {
      configVersion: 1,
      app: { id: "ru.example.app", name: "App", version: "1.0.0" },
      web: { root: "dist", entry: "index.html" },
      permissions: [],
      plugins: [],
    };
    const effective = resolveEffectiveConfig(config, []);
    const cmake = generateCMakeLists("ru.example.app", "1.0.0", []);
    expect(cmake).toContain("qt5_add_translation");
    expect(cmake).not.toContain("auroraapp_i18n");
    const spec = generateSpec("ru.example.app", effective);
    expect(spec).not.toContain("pkgconfig(auroraapp_i18n)");
    expect(spec).toContain("translations/*.qm");
  });
});
