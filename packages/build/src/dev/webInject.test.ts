import { describe, expect, it } from "vitest";
import { injectAuroboreWebMode, injectPolyfillsScript, WEB_MODE_MARKER } from "./webInject.js";

describe("injectAuroboreWebMode", () => {
  it("injects chrome link and bridge scripts", () => {
    const html = "<!DOCTYPE html><html><head></head><body><div id='root'></div></body></html>";
    const out = injectAuroboreWebMode(html);
    expect(out).toContain(WEB_MODE_MARKER);
    expect(out).toContain("/css/aurobore-chrome.css");
    expect(out).toContain("/js/aurobore-bridge-web.js");
    expect(out).toContain("/js/aurobore-plugins.js");
    expect(out).toContain("/js/aurobore-web-shim.js");
  });

  it("injects polyfills when requested", () => {
    const html = "<!DOCTYPE html><html><head></head><body></body></html>";
    const out = injectAuroboreWebMode(html, { polyfills: true });
    expect(out).toContain("/js/aurobore-polyfills.js");
  });

  it("carries data-polyfills with selected ids", () => {
    const html = "<!DOCTYPE html><html><head></head><body></body></html>";
    const out = injectAuroboreWebMode(html, {
      polyfills: ["geolocation", "clipboard", "mediaDevices"],
    });
    expect(out).toContain("/js/aurobore-polyfills.js");
    expect(out).toContain('data-polyfills="geolocation,clipboard,mediaDevices"');
  });

  it("omits data-polyfills for default set (polyfills: true)", () => {
    const html = "<!DOCTYPE html><html><head></head><body></body></html>";
    const out = injectAuroboreWebMode(html, { polyfills: true });
    expect(out).not.toContain("data-polyfills=");
  });

  it("does not inject polyfills when disabled", () => {
    const html = "<!DOCTYPE html><html><head></head><body></body></html>";
    expect(injectAuroboreWebMode(html, { polyfills: [] })).not.toContain("aurobore-polyfills.js");
    expect(injectAuroboreWebMode(html, { polyfills: null })).not.toContain("aurobore-polyfills.js");
  });

  it("is idempotent", () => {
    const html = "<!DOCTYPE html><html><head></head><body></body></html>";
    const once = injectAuroboreWebMode(html);
    expect(injectAuroboreWebMode(once)).toBe(once);
  });
});

describe("injectPolyfillsScript", () => {
  it("inserts after plugins script", () => {
    const html = `<script src="/js/aurobore-plugins.js"></script>`;
    const out = injectPolyfillsScript(html);
    expect(out.indexOf("aurobore-plugins")).toBeLessThan(out.indexOf("aurobore-polyfills"));
  });

  it("carries data-polyfills with selected ids", () => {
    const html = `<script src="/js/aurobore-plugins.js"></script>`;
    const out = injectPolyfillsScript(html, "/js/aurobore-polyfills.js", ["share", "mediaDevices"]);
    expect(out).toContain('data-polyfills="share,mediaDevices"');
  });
});
