import { describe, expect, it } from "vitest";
import {
  APP_TEMPLATES,
  isAppTemplateName,
  isViteAppTemplate,
  resolveTemplateDir,
} from "./server.js";

describe("app templates", () => {
  it("APP_TEMPLATES включает react/vue/svelte", () => {
    expect(APP_TEMPLATES).toContain("react");
    expect(APP_TEMPLATES).toContain("vue");
    expect(APP_TEMPLATES).toContain("svelte");
  });

  it("isAppTemplateName отклоняет неизвестные имена", () => {
    expect(isAppTemplateName("react")).toBe(true);
    expect(isAppTemplateName("angular")).toBe(false);
  });

  it("isViteAppTemplate для фреймворков", () => {
    expect(isViteAppTemplate("react")).toBe(true);
    expect(isViteAppTemplate("vanilla")).toBe(false);
  });

  it("resolveTemplateDir находит react в монорепо", () => {
    const dir = resolveTemplateDir("react");
    expect(dir.replace(/\\/g, "/")).toMatch(/templates\/react$/);
  });
});
