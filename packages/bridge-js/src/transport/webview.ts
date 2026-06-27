import { BRIDGE_CHANNEL } from "@aurobore/core";
import type { BridgeInbound, BridgeOutbound } from "@aurobore/core";
import type { BridgeTransport } from "./types.js";

declare global {
  function sendAsyncMessage(name: string, data: unknown): void;
  var __auroboreBridgeReceive: ((msg: BridgeInbound) => void) | undefined;
}

/** Production-транспорт через Aurora WebView async messages. */
export class WebViewTransport implements BridgeTransport {
  private handlers = new Set<(msg: BridgeInbound) => void>();

  constructor() {
    globalThis.__auroboreBridgeReceive = (msg: BridgeInbound) => {
      for (const handler of this.handlers) {
        handler(msg);
      }
    };
  }

  send(message: BridgeOutbound): void {
    if (typeof globalThis.sendAsyncMessage !== "function") {
      console.warn("[aurobore-bridge] sendAsyncMessage unavailable");
      return;
    }
    // Aurora WebView: nested objects may fail CefValue conversion — send JSON string.
    globalThis.sendAsyncMessage(BRIDGE_CHANNEL, JSON.stringify(message));
  }

  onReceive(handler: (msg: BridgeInbound) => void): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
}
