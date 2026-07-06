import { describe, expect, it, vi, beforeEach } from "vitest";
import { bindAurobore, type AuroboreBridge } from "@aurobore/core";
import { installPolyfills } from "./index.js";
import { mapAuroboreCode } from "./errors.js";

function createMockBridge(overrides: Partial<AuroboreBridge> = {}): AuroboreBridge {
  return {
    invoke: vi.fn().mockResolvedValue({}),
    on: vi.fn(() => () => {}),
    off: vi.fn(),
    emit: vi.fn(),
    ...overrides,
  };
}

describe("installPolyfills", () => {
  beforeEach(() => {
    bindAurobore(null);
    const g = globalThis as { Aurobore?: unknown; Notification?: unknown };
    delete g.Aurobore;
    delete g.Notification;
  });

  it("patches navigator.geolocation", async () => {
    const bridge = createMockBridge({
      invoke: vi.fn().mockResolvedValue({
        latitude: 55.75,
        longitude: 37.62,
        accuracy: 10,
        timestamp: 1,
      }),
    });
    bindAurobore(bridge);
    (globalThis as unknown as { Aurobore: AuroboreBridge }).Aurobore = bridge;

    await installPolyfills({ only: ["geolocation"], waitForBridge: false });

    await new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          expect(pos.coords.latitude).toBe(55.75);
          resolve();
        },
        reject,
      );
    });

    expect(bridge.invoke).toHaveBeenCalledWith("Geolocation", "getCurrentPosition", {
      enableHighAccuracy: undefined,
      timeout: undefined,
      maximumAge: undefined,
    });
  });

  it("patches navigator.clipboard", async () => {
    const bridge = createMockBridge({
      invoke: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ text: "hello" }),
    });
    bindAurobore(bridge);
    (globalThis as unknown as { Aurobore: AuroboreBridge }).Aurobore = bridge;

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });

    await installPolyfills({ only: ["clipboard"], waitForBridge: false });
    await navigator.clipboard.writeText("hello");
    const text = await navigator.clipboard.readText();
    expect(text).toBe("hello");
  });
});

describe("mapAuroboreCode", () => {
  it("maps permission denied", () => {
    const err = mapAuroboreCode("BRIDGE_PERMISSION_DENIED", "nope");
    expect(err.name).toBe("NotAllowedError");
  });
});
