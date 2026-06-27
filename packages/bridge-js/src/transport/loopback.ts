import type { BridgeInbound, BridgeMessage, BridgeOutbound } from "@aurobore/core";
import type { LoopbackTransportLike } from "./types.js";

type Handler = (msg: BridgeInbound) => void;
type RawHandler = (msg: BridgeMessage) => void;

/** In-memory транспорт для unit-тестов: попарное соединение JS↔JS. */
export class LoopbackTransport implements LoopbackTransportLike {
  private handlers = new Set<Handler>();
  private rawHandlers = new Set<RawHandler>();
  peer: LoopbackTransport | null = null;

  static pair(): [LoopbackTransport, LoopbackTransport] {
    const a = new LoopbackTransport();
    const b = new LoopbackTransport();
    a.peer = b;
    b.peer = a;
    return [a, b];
  }

  send(message: BridgeOutbound): void {
    this.sendRaw(message);
  }

  sendRaw(message: BridgeMessage): void {
    if (!this.peer) return;
    queueMicrotask(() => {
      for (const handler of this.peer!.handlers) {
        handler(message as BridgeInbound);
      }
      for (const handler of this.peer!.rawHandlers) {
        handler(message);
      }
    });
  }

  onReceive(handler: Handler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  onReceiveRaw(handler: RawHandler): () => void {
    this.rawHandlers.add(handler);
    return () => {
      this.rawHandlers.delete(handler);
    };
  }
}

/** Симуляция native-стороны в loopback-тестах. */
export class LoopbackNativeStub {
  private activeStreamId: string | null = null;
  private streamTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly transport: LoopbackTransport) {
    transport.onReceiveRaw((msg) => {
      if (msg.type === "cancel") {
        if (this.activeStreamId === msg.id && this.streamTimeoutId !== null) {
          clearTimeout(this.streamTimeoutId);
          this.streamTimeoutId = null;
          this.activeStreamId = null;
        }
        return;
      }
      if (msg.type === "invoke") {
        const { id, plugin, method, args } = msg;
        if (plugin === "Echo" && method === "ping") {
          this.reply(id, true, { pong: true });
        } else if (plugin === "Echo" && method === "echo") {
          this.reply(id, true, args);
        } else if (plugin === "Echo" && method === "fail") {
          this.reply(id, false, {
            code: "ECHO_TEST_ERROR",
            message: "demo error",
            data: { code: 42 },
          });
        } else if (plugin === "Echo" && method === "watchTicks") {
          this.streamTicks(id);
        } else {
          this.reply(id, false, {
            code: "BRIDGE_METHOD_NOT_FOUND",
            message: `Unknown method ${method}`,
          });
        }
      } else if (msg.type === "event" && msg.name === "app:demo") {
        this.transport.sendRaw({
          type: "event",
          name: "app:echo",
          data: msg.data,
        });
      }
    });
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

  private streamTicks(subscriptionId: string): void {
    this.activeStreamId = subscriptionId;
    let tick = 0;
    const send = (): void => {
      tick += 1;
      if (tick <= 5) {
        this.transport.sendRaw({
          type: "stream",
          subscriptionId,
          phase: "data",
          payload: { tick },
        });
        this.streamTimeoutId = setTimeout(send, 10);
      } else {
        this.streamTimeoutId = null;
        this.activeStreamId = null;
        this.transport.sendRaw({
          type: "stream",
          subscriptionId,
          phase: "complete",
        });
      }
    };
    send();
  }
}
