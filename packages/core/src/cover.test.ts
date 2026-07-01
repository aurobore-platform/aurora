import { afterEach, describe, expect, it, vi } from "vitest";
import { bindAurobore } from "./aurobore.js";
import type { AuroboreBridge } from "./aurobore.js";
import { cover } from "./cover.js";

function mockBridge(): AuroboreBridge & { invoke: ReturnType<typeof vi.fn> } {
  const handlers = new Map<string, Set<(data: unknown) => void>>();
  return {
    invoke: vi.fn(async () => ({ ok: true })),
    on(name, handler) {
      if (!handlers.has(name)) handlers.set(name, new Set());
      handlers.get(name)!.add(handler);
      return () => handlers.get(name)?.delete(handler);
    },
    off(name, handler) {
      handlers.get(name)?.delete(handler);
    },
    emit(name, data) {
      for (const h of handlers.get(name) ?? []) h(data);
    },
  };
}

describe("cover API", () => {
  afterEach(() => {
    bindAurobore(null);
  });

  it("setState вызывает invoke Cover.setState", async () => {
    const bridge = mockBridge();
    bindAurobore(bridge);
    await cover.setState({ primaryText: "Now playing", secondaryText: "Track" });
    expect(bridge.invoke).toHaveBeenCalledWith(
      "Cover",
      "setState",
      { primaryText: "Now playing", secondaryText: "Track" },
      undefined,
    );
  });

  it("setActions передаёт actions в invoke", async () => {
    const bridge = mockBridge();
    bindAurobore(bridge);
    await cover.setActions([{ id: "play", label: "Play", icon: "icon-m-play" }]);
    expect(bridge.invoke).toHaveBeenCalledWith(
      "Cover",
      "setActions",
      { actions: [{ id: "play", label: "Play", icon: "icon-m-play" }] },
      undefined,
    );
  });

  it("onAction подписывается на cover:action", () => {
    const bridge = mockBridge();
    bindAurobore(bridge);
    const handler = vi.fn();
    const off = cover.onAction(handler);
    bridge.emit("cover:action", { id: "play" });
    expect(handler).toHaveBeenCalledWith({ id: "play" });
    off();
    bridge.emit("cover:action", { id: "next" });
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
