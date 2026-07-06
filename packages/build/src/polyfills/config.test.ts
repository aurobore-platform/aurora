import { describe, expect, it } from "vitest";
import type { AuroboreConfig } from "../config/types.js";
import { DEFAULT_POLYFILL_IDS, isPolyfillsEnabled, resolvePolyfillIds } from "./config.js";

function configWith(polyfills: AuroboreConfig["web"]["polyfills"]): AuroboreConfig {
  return { web: { polyfills } } as unknown as AuroboreConfig;
}

describe("resolvePolyfillIds", () => {
  it("resolves `true` to the 4 lightweight polyfills without mediaDevices", () => {
    const ids = resolvePolyfillIds(configWith(true));
    expect(ids).toEqual(["geolocation", "share", "notification", "clipboard"]);
    expect(ids).not.toContain("mediaDevices");
    expect(ids).toEqual([...DEFAULT_POLYFILL_IDS]);
  });

  it("keeps explicit list as-is (mediaDevices opt-in)", () => {
    expect(resolvePolyfillIds(configWith(["mediaDevices"]))).toEqual(["mediaDevices"]);
    expect(resolvePolyfillIds(configWith(["clipboard", "mediaDevices"]))).toEqual([
      "clipboard",
      "mediaDevices",
    ]);
  });

  it("returns null when disabled", () => {
    expect(resolvePolyfillIds(configWith(false))).toBeNull();
    expect(resolvePolyfillIds(configWith(undefined))).toBeNull();
    expect(resolvePolyfillIds(configWith([]))).toBeNull();
  });
});

describe("isPolyfillsEnabled", () => {
  it("true for `true` and non-empty list, false otherwise", () => {
    expect(isPolyfillsEnabled(configWith(true))).toBe(true);
    expect(isPolyfillsEnabled(configWith(["mediaDevices"]))).toBe(true);
    expect(isPolyfillsEnabled(configWith(false))).toBe(false);
    expect(isPolyfillsEnabled(configWith([]))).toBe(false);
    expect(isPolyfillsEnabled(configWith(undefined))).toBe(false);
  });
});
