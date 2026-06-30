import { describe, expect, it, vi } from "vitest";
import {
  BRIDGE_ERROR_CODES,
  isResourceRef,
  resolveResourceUrl,
} from "@aurobore/core";
import { Bridge } from "./bridge.js";
import { LoopbackNativeStub, LoopbackTransport } from "./transport/loopback.js";
import { resetCallIdCounter } from "./messages.js";

describe("Bridge (loopback)", () => {
  function setup(): { bridge: Bridge; native: LoopbackNativeStub } {
    resetCallIdCounter();
    const [jsSide, nativeSide] = LoopbackTransport.pair();
    const bridge = new Bridge(jsSide);
    const native = new LoopbackNativeStub(nativeSide);
    return { bridge, native };
  }

  it("invoke ping → Promise resolve", async () => {
    const { bridge } = setup();
    const result = await bridge.invoke("Echo", "ping");
    expect(result).toEqual({ pong: true });
  });

  it("invoke echo возвращает args", async () => {
    const { bridge } = setup();
    const result = await bridge.invoke("Echo", "echo", { hello: "world" });
    expect(result).toEqual({ hello: "world" });
  });

  it("invoke fail → reject со structured error", async () => {
    const { bridge } = setup();
    await expect(bridge.invoke("Echo", "fail")).rejects.toEqual({
      code: "ECHO_TEST_ERROR",
      message: "demo error",
      data: { code: 42 },
    });
  });

  it("корреляция: два параллельных invoke не перепутываются", async () => {
    const { bridge } = setup();
    const [a, b] = await Promise.all([
      bridge.invoke("Echo", "echo", { id: "a" }),
      bridge.invoke("Echo", "echo", { id: "b" }),
    ]);
    expect(a).toEqual({ id: "a" });
    expect(b).toEqual({ id: "b" });
  });

  it("bidirectional events: emit app:demo → on app:echo", async () => {
    const { bridge } = setup();
    const received = vi.fn();
    bridge.on("app:echo", received);
    bridge.emit("app:demo", { hello: "native" });
    await new Promise((r) => setTimeout(r, 0));
    expect(received).toHaveBeenCalledWith({ hello: "native" });
  });

  it("stream watchTicks: data → complete", async () => {
    const { bridge } = setup();
    const ticks: number[] = [];
    const sub = (await bridge.invoke("Echo", "watchTicks", {}, { stream: true })) as import("./bridge.js").StreamSubscription;
    sub.onData = (payload: unknown) => {
      ticks.push((payload as { tick: number }).tick);
    };
    await new Promise<void>((resolve) => {
      sub.onComplete = resolve;
    });
    expect(ticks).toEqual([1, 2, 3, 4, 5]);
  });

  it("stream watchFastTicks: coalescing снижает число onData", async () => {
    const { bridge } = setup();
    const ticks: number[] = [];
    const sub = (await bridge.invoke("Echo", "watchFastTicks", {}, {
      stream: true,
      streamCoalesce: true,
    })) as import("./bridge.js").StreamSubscription;
    sub.onData = (payload: unknown) => {
      ticks.push((payload as { tick: number }).tick);
    };
    await new Promise<void>((resolve) => {
      sub.onComplete = resolve;
    });
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.length).toBeLessThan(100);
    expect(ticks[ticks.length - 1]).toBe(100);
  });

  it("stream watchFastTicks без coalesce доставляет все тики", async () => {
    const { bridge } = setup();
    const ticks: number[] = [];
    const sub = (await bridge.invoke("Echo", "watchFastTicks", {}, {
      stream: true,
      streamCoalesce: false,
    })) as import("./bridge.js").StreamSubscription;
    sub.onData = (payload: unknown) => {
      ticks.push((payload as { tick: number }).tick);
    };
    await new Promise<void>((resolve) => {
      sub.onComplete = resolve;
    });
    expect(ticks).toHaveLength(100);
    expect(ticks[99]).toBe(100);
  });

  it("getSampleResource возвращает ResourceRef", async () => {
    const { bridge } = setup();
    const result = await bridge.invoke("Echo", "getSampleResource");
    expect(isResourceRef(result)).toBe(true);
    if (isResourceRef(result)) {
      expect(result.url).toContain("/app-data/echo/sample.txt");
      expect(resolveResourceUrl(result, "https://127.0.0.1:1")).toBe(
        "https://127.0.0.1:1/app-data/echo/sample.txt",
      );
    }
  });

  it("timeout reject", async () => {
    resetCallIdCounter();
    const [jsSide] = LoopbackTransport.pair();
    const bridge = new Bridge(jsSide);
    await expect(
      bridge.invoke("Echo", "ping", undefined, { timeoutMs: 50 }),
    ).rejects.toMatchObject({
      code: BRIDGE_ERROR_CODES.TIMEOUT,
    });
  });

  it("once вызывает handler один раз", async () => {
    const { bridge } = setup();
    const received = vi.fn();
    bridge.once("app:echo", received);
    bridge.emit("app:demo", { n: 1 });
    bridge.emit("app:demo", { n: 2 });
    await new Promise((r) => setTimeout(r, 0));
    expect(received).toHaveBeenCalledTimes(1);
    expect(received).toHaveBeenCalledWith({ n: 1 });
  });

  it("invalid JSON args reject до отправки", async () => {
    const { bridge } = setup();
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    await expect(
      bridge.invoke("Echo", "echo", circular),
    ).rejects.toMatchObject({
      code: BRIDGE_ERROR_CODES.INVALID_ARGS,
    });
  });

  it("AbortSignal отменяет stream на native", async () => {
    const { bridge } = setup();
    const controller = new AbortController();
    const ticks: number[] = [];
    const sub = (await bridge.invoke("Echo", "watchTicks", {}, {
      stream: true,
      signal: controller.signal,
    })) as import("./bridge.js").StreamSubscription;

    await new Promise<void>((resolve) => {
      sub.onData = (payload: unknown) => {
        ticks.push((payload as { tick: number }).tick);
        if (ticks.length === 2) controller.abort();
      };
      sub.onError = () => resolve();
    });
    expect(ticks.length).toBeLessThan(5);
  });
});
