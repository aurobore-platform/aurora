import type { BridgeInbound, BridgeMessage, BridgeOutbound } from "@aurobore/core";
import { MockNativeHost } from "../mock-host.js";
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

/** Симуляция native-стороны в loopback-тестах (делегирует в MockNativeHost). */
export class LoopbackNativeStub {
  constructor(transport: LoopbackTransport) {
    new MockNativeHost(transport);
  }
}
