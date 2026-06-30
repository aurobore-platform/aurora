import { describe, expect, it } from "vitest";
import {
  APP_DATA_URL_PREFIX,
  createResourceRef,
  isResourceRef,
  resolveResourceUrl,
} from "./resource.js";

describe("resource", () => {
  it("createResourceRef builds logical app-data URL", () => {
    const ref = createResourceRef("samples/demo.txt", { mimeType: "text/plain", size: 12 });
    expect(ref).toEqual({
      kind: "resource",
      url: `${APP_DATA_URL_PREFIX}samples/demo.txt`,
      mimeType: "text/plain",
      size: 12,
    });
  });

  it("isResourceRef type guard", () => {
    expect(isResourceRef(createResourceRef("a.bin"))).toBe(true);
    expect(isResourceRef({ kind: "resource", url: "x" })).toBe(true);
    expect(isResourceRef({ kind: "other", url: "x" })).toBe(false);
    expect(isResourceRef(null)).toBe(false);
  });

  it("resolveResourceUrl maps aurobore-app to wire origin", () => {
    const ref = createResourceRef("echo/sample.txt");
    expect(resolveResourceUrl(ref, "https://127.0.0.1:38491")).toBe(
      "https://127.0.0.1:38491/app-data/echo/sample.txt",
    );
  });

  it("resolveResourceUrl passes through https URLs", () => {
    expect(resolveResourceUrl("https://example.com/x")).toBe("https://example.com/x");
  });
});
