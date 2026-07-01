import { afterEach, describe, expect, it, vi } from "vitest";
import { bindAurobore, type AuroboreBridge } from "@aurobore/core";
import { subscribeLifecycle } from "./lifecycle.js";
import { subscribeAuroboreEvent } from "./events.js";

function createMockBridge(): AuroboreBridge & { emit: (name: string, data?: unknown) => void } {
  const handlers = new Map<string, Set<(data: unknown) => void>>();
  return {
    invoke: vi.fn().mockResolvedValue({}),
    on(name, handler) {
      let set = handlers.get(name);
      if (!set) {
        set = new Set();
        handlers.set(name, set);
      }
      set.add(handler);
      return () => set!.delete(handler);
    },
    off(name, handler) {
      handlers.get(name)?.delete(handler);
    },
    emit(name, data) {
      for (const h of handlers.get(name) ?? []) h(data);
    },
  };
}

describe("@aurobore/vue lifecycle", () => {
  const bridge = createMockBridge();

  afterEach(() => {
    bindAurobore(null);
  });

  it("subscribeLifecycle получает ready/pause/resume", () => {
    bindAurobore(bridge);
    const events: string[] = [];
    const unsub = subscribeLifecycle((e) => events.push(e));

    bridge.emit("ready");
    bridge.emit("pause");
    unsub();

    expect(events).toEqual(["ready", "pause"]);
  });

  it("subscribeAuroboreEvent доставляет payload", () => {
    bindAurobore(bridge);
    const handler = vi.fn();
    subscribeAuroboreEvent("cover:action", handler);
    bridge.emit("cover:action", { id: "share" });
    expect(handler).toHaveBeenCalledWith({ id: "share" });
  });
});
