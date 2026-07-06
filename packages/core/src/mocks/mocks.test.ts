import { describe, expect, it } from "vitest";
import { createMockPluginState, dispatchMockInvoke } from "./handlers.js";
import { MOCK_GEO_POSITION, MOCK_PHOTO_FIXTURE } from "./defaults.js";

describe("dispatchMockInvoke", () => {
  const state = createMockPluginState();

  it("Echo ping", () => {
    const r = dispatchMockInvoke("Echo", "ping", {}, state);
    expect(r).toEqual({ type: "ok", result: { pong: true } });
  });

  it("Echo watchTicks → stream", () => {
    const r = dispatchMockInvoke("Echo", "watchTicks", {}, state);
    expect(r.type).toBe("stream");
    if (r.type === "stream") {
      expect(r.stream.count).toBe(5);
      expect(r.stream.payload(1)).toEqual({ tick: 1 });
    }
  });

  it("Device getInfo", () => {
    const r = dispatchMockInvoke("Device", "getInfo", {}, state);
    expect(r.type).toBe("ok");
    if (r.type === "ok") {
      expect(r.result).toMatchObject({ platform: "web", model: "Aurobore Web Mock" });
    }
  });

  it("Storage round-trip", () => {
    dispatchMockInvoke("Storage", "set", { key: "k", value: "v" }, state);
    const r = dispatchMockInvoke("Storage", "get", { key: "k" }, state);
    expect(r).toEqual({ type: "ok", result: { value: "v" } });
  });

  it("FileSystem write/read", () => {
    dispatchMockInvoke("FileSystem", "writeText", { path: "test.txt", text: "hello" }, state);
    const r = dispatchMockInvoke("FileSystem", "readText", { path: "test.txt" }, state);
    expect(r).toEqual({ type: "ok", result: { text: "hello" } });
  });

  it("FileSystem rejects ..", () => {
    const r = dispatchMockInvoke("FileSystem", "readText", { path: "../etc/passwd" }, state);
    expect(r.type).toBe("error");
    if (r.type === "error") expect(r.error.code).toBe("FILESYSTEM_INVALID_PATH");
  });

  it("Clipboard copy/paste", () => {
    dispatchMockInvoke("Clipboard", "copy", { text: "copied" }, state);
    const r = dispatchMockInvoke("Clipboard", "paste", {}, state);
    expect(r).toEqual({ type: "ok", result: { text: "copied" } });
  });

  it("Network getStatus", () => {
    const r = dispatchMockInvoke("Network", "getStatus", {}, state);
    expect(r.type).toBe("ok");
    if (r.type === "ok") {
      expect(r.result).toMatchObject({ connectionType: "wifi" });
    }
  });

  it("Camera getPhoto → fixture ref", () => {
    const r = dispatchMockInvoke("Camera", "getPhoto", { quality: 80 }, state);
    expect(r.type).toBe("ok");
    if (r.type === "ok") {
      const photo = r.result as { url: string; mimeType: string };
      expect(photo.url).toContain(MOCK_PHOTO_FIXTURE.path);
      expect(photo.mimeType).toBe("image/jpeg");
    }
  });

  it("Geolocation getCurrentPosition", () => {
    const r = dispatchMockInvoke("Geolocation", "getCurrentPosition", {}, state);
    expect(r.type).toBe("ok");
    if (r.type === "ok") {
      expect(r.result).toMatchObject({
        latitude: MOCK_GEO_POSITION.latitude,
        longitude: MOCK_GEO_POSITION.longitude,
      });
    }
  });

  it("Geolocation watch → stream", () => {
    const r = dispatchMockInvoke("Geolocation", "watch", {}, state);
    expect(r.type).toBe("stream");
  });

  it("Sensors watchAccelerometer → stream", () => {
    const r = dispatchMockInvoke("Sensors", "watchAccelerometer", {}, state);
    expect(r.type).toBe("stream");
  });

  it("Notifications notify", () => {
    const r = dispatchMockInvoke("Notifications", "notify", { title: "t", body: "b" }, state);
    expect(r).toEqual({ type: "ok", result: { id: "mock-notif-1" } });
  });

  it("Share shareText", () => {
    const r = dispatchMockInvoke("Share", "shareText", { text: "hi" }, state);
    expect(r.type).toBe("ok");
  });

  it("unknown method → BRIDGE_METHOD_NOT_FOUND", () => {
    const r = dispatchMockInvoke("Echo", "unknown", {}, state);
    expect(r.type).toBe("error");
    if (r.type === "error") expect(r.error.code).toBe("BRIDGE_METHOD_NOT_FOUND");
  });
});
