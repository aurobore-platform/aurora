import { describe, expect, it, vi } from "vitest";
import { MOCK_GEO_POSITION, MOCK_PHOTO_FIXTURE } from "@aurobore/core";
import { Bridge } from "./bridge.js";
import { MockNativeHost } from "./mock-host.js";
import { LoopbackTransport } from "./transport/loopback.js";
import { resetCallIdCounter } from "./messages.js";

describe("MockNativeHost (integration)", () => {
  function setup() {
    resetCallIdCounter();
    const [jsSide, nativeSide] = LoopbackTransport.pair();
    new MockNativeHost(nativeSide);
    const bridge = new Bridge(jsSide);
    return { bridge };
  }

  it("Camera getPhoto → fixture ref", async () => {
    const { bridge } = setup();
    const photo = (await bridge.invoke("Camera", "getPhoto", { quality: 80 })) as {
      url: string;
      mimeType: string;
    };
    expect(photo.url).toContain(MOCK_PHOTO_FIXTURE.path);
    expect(photo.mimeType).toBe("image/jpeg");
  });

  it("Geolocation getCurrentPosition → mock coords", async () => {
    const { bridge } = setup();
    const pos = (await bridge.invoke("Geolocation", "getCurrentPosition", {})) as {
      latitude: number;
      longitude: number;
    };
    expect(pos.latitude).toBe(MOCK_GEO_POSITION.latitude);
    expect(pos.longitude).toBe(MOCK_GEO_POSITION.longitude);
  });

  it("Device getInfo", async () => {
    const { bridge } = setup();
    const info = (await bridge.invoke("Device", "getInfo", {})) as { platform: string };
    expect(info.platform).toBe("web");
  });

  it("lifecycle ready event", async () => {
    resetCallIdCounter();
    const [jsSide, nativeSide] = LoopbackTransport.pair();
    new MockNativeHost(nativeSide);
    const bridge = new Bridge(jsSide);
    const received = vi.fn();
    bridge.on("ready", received);
    nativeSide.sendRaw({ type: "event", name: "ready" });
    await new Promise((r) => setTimeout(r, 0));
    expect(received).toHaveBeenCalled();
  });
});
