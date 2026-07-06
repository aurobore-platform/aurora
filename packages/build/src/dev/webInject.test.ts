import { describe, expect, it } from "vitest";
import { injectAuroboreWebMode, WEB_MODE_MARKER } from "./webInject.js";

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

  it("is idempotent", () => {
    const html = "<!DOCTYPE html><html><head></head><body></body></html>";
    const once = injectAuroboreWebMode(html);
    expect(injectAuroboreWebMode(once)).toBe(once);
  });
});
