import { afterEach, describe, expect, it, vi } from "vitest";
import { bindAurobore, type AuroboreBridge } from "@aurobore/core";
import { subscribeLifecycle } from "./lifecycle.js";
import { auroboreEventStore } from "./index.js";

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

describe("@aurobore/svelte", () => {
  const bridge = createMockBridge();

  afterEach(() => {
    bindAurobore(null);
  });

  it("subscribeLifecycle получает события", () => {
    bindAurobore(bridge);
    const events: string[] = [];
    subscribeLifecycle((e) => events.push(e));
    bridge.emit("resume");
    expect(events).toEqual(["resume"]);
  });

  it("auroboreEventStore обновляет значение", () => {
    bindAurobore(bridge);
    const store = auroboreEventStore<{ n: number }>("test");
    const values: Array<{ n: number } | undefined> = [];
    const unsub = store.subscribe((v) => values.push(v));
    bridge.emit("test", { n: 42 });
    unsub();
    expect(values).toContainEqual({ n: 42 });
  });
});
