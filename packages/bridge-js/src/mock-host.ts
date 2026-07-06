import {
  createMockPluginState,
  dispatchMockEvent,
  dispatchMockInvoke,
  type MockPluginState,
} from "@aurobore/core";
import type { BridgeMessage } from "@aurobore/core";
import type { LoopbackTransport } from "./transport/loopback.js";

/** Native-сторона loopback-моста: mock-плагины для browser dev mode и unit-тестов. */
export class MockNativeHost {
  private readonly state: MockPluginState;
  private activeStreamId: string | null = null;
  private streamTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly transport: LoopbackTransport, state?: MockPluginState) {
    this.state = state ?? createMockPluginState();
    transport.onReceiveRaw((msg) => this.handleMessage(msg));
  }

  private handleMessage(msg: BridgeMessage): void {
    if (msg.type === "cancel") {
      if (this.activeStreamId === msg.id) {
        if (this.streamTimeoutId !== null) {
          clearTimeout(this.streamTimeoutId);
          this.streamTimeoutId = null;
        }
        this.activeStreamId = null;
      }
      return;
    }

    if (msg.type === "invoke") {
      const { id, plugin, method, args } = msg;
      const result = dispatchMockInvoke(plugin, method, args, this.state);

      if (result.type === "ok") {
        this.reply(id, true, result.result);
      } else if (result.type === "error") {
        this.reply(id, false, result.error);
      } else if (result.type === "stream") {
        this.runStream(id, result.stream);
      } else {
        this.reply(id, false, {
          code: "BRIDGE_METHOD_NOT_FOUND",
          message: `Unknown method ${method}`,
        });
      }
      return;
    }

    if (msg.type === "event") {
      dispatchMockEvent(msg.name, msg.data, (name, data) => {
        this.transport.sendRaw({ type: "event", name, data });
      });
    }
  }

  private reply(id: string, ok: boolean, payload: unknown): void {
    if (ok) {
      this.transport.sendRaw({ type: "response", id, ok: true, result: payload });
    } else {
      this.transport.sendRaw({
        type: "response",
        id,
        ok: false,
        error: payload as { code: string; message: string; data?: unknown },
      });
    }
  }

  private runStream(
    subscriptionId: string,
    spec: { count: number; intervalMs: number; payload: (tick: number) => unknown },
  ): void {
    this.activeStreamId = subscriptionId;
    let tick = 0;

    const sendComplete = (): void => {
      this.streamTimeoutId = null;
      this.activeStreamId = null;
      this.transport.sendRaw({
        type: "stream",
        subscriptionId,
        phase: "complete",
      });
    };

    const sendTick = (): void => {
      tick += 1;
      if (tick <= spec.count) {
        this.transport.sendRaw({
          type: "stream",
          subscriptionId,
          phase: "data",
          payload: spec.payload(tick),
        });
        if (tick < spec.count) {
          if (spec.intervalMs <= 0) {
            sendTick();
          } else {
            this.streamTimeoutId = setTimeout(sendTick, spec.intervalMs);
          }
        } else {
          sendComplete();
        }
      }
    };

    if (spec.intervalMs <= 0) {
      queueMicrotask(() => {
        for (let i = 1; i <= spec.count; i += 1) {
          this.transport.sendRaw({
            type: "stream",
            subscriptionId,
            phase: "data",
            payload: spec.payload(i),
          });
        }
        this.activeStreamId = null;
        this.transport.sendRaw({
          type: "stream",
          subscriptionId,
          phase: "complete",
        });
      });
    } else {
      sendTick();
    }
  }
}
