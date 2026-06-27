import type { BridgeInbound, BridgeMessage, BridgeOutbound } from "@aurobore/core";

/** Тонкий шов транспорта моста (ADR-004). */
export interface BridgeTransport {
  send(message: BridgeOutbound): void;
  onReceive(handler: (msg: BridgeInbound) => void): () => void;
}

/** Loopback принимает сообщения в обе стороны (для тестов). */
export interface LoopbackTransportLike extends BridgeTransport {
  sendRaw(message: BridgeMessage): void;
  onReceiveRaw(handler: (msg: BridgeMessage) => void): () => void;
}
