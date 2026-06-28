import { afterEach, describe, expect, it, vi } from "vitest";
import { AuroboreError } from "./errors.js";
import {
  bindAurobore,
  emit,
  getAurobore,
  invoke,
  off,
  on,
  once,
} from "./aurobore.js";
import type { AuroboreBridge } from "./aurobore.js";

function mockBridge(): AuroboreBridge {
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
    once(name, handler) {
      const wrapped = (data: unknown) => {
        off(name, wrapped);
        handler(data);
      };
      return on(name, wrapped);
    },
    emit(name, data) {
      for (const h of handlers.get(name) ?? []) h(data);
    },
  };
}

describe("Aurobore facade", () => {
  afterEach(() => {
    bindAurobore(null);
  });

  it("getAurobore бросает без runtime", () => {
    expect(() => getAurobore()).toThrow(AuroboreError);
  });

  it("bindAurobore позволяет invoke через mock", async () => {
    const bridge = mockBridge();
    bindAurobore(bridge);
    await invoke("Echo", "ping", {});
    expect(bridge.invoke).toHaveBeenCalledWith("Echo", "ping", {}, undefined);
  });

  it("once вызывает handler один раз", () => {
    const bridge = mockBridge();
    bindAurobore(bridge);
    const handler = vi.fn();
    once("pause", handler);
    emit("pause", { ts: 1 });
    emit("pause", { ts: 2 });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ ts: 1 });
  });

  it("on/off работают через mock", () => {
    const bridge = mockBridge();
    bindAurobore(bridge);
    const handler = vi.fn();
    const unsubscribe = on("resume", handler);
    emit("resume");
    unsubscribe();
    emit("resume");
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
