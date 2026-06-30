import {
  BRIDGE_ERROR_CODES,
  createBridgeError,
  createCancel,
  isEventMessage,
  isResponseMessage,
  isStreamMessage,
  type BridgeError,
  type BridgeInbound,
} from "@aurobore/core";
import { createInvoke } from "./messages.js";
import type { BridgeTransport } from "./transport/types.js";

export interface InvokeOptions {
  stream?: boolean;
  maxFps?: number;
  /** Latest-wins coalescing для phase:data (default true, FR-B8). */
  streamCoalesce?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface StreamSubscription {
  subscriptionId: string;
  onData: (payload: unknown) => void;
  onError: (error: BridgeError) => void;
  onComplete: () => void;
  stop: () => void;
}

type PendingEntry = {
  resolve: (value: unknown) => void;
  reject: (error: BridgeError) => void;
  timeoutId?: ReturnType<typeof setTimeout>;
  abortHandler?: () => void;
};

type StreamEntry = {
  onData: (payload: unknown) => void;
  onError: (error: BridgeError) => void;
  onComplete: () => void;
  coalesce: boolean;
  pendingPayload?: unknown;
  hasPending: boolean;
  flushScheduled: boolean;
};

const DEFAULT_TIMEOUT_MS = 30_000;

function assertJsonSerializable(value: unknown): void {
  try {
    JSON.stringify(value);
  } catch {
    throw createBridgeError(BRIDGE_ERROR_CODES.INVALID_ARGS, "Arguments are not JSON-serializable");
  }
}

function scheduleStreamFlush(
  streams: Map<string, StreamEntry>,
  subscriptionId: string,
): void {
  const stream = streams.get(subscriptionId);
  if (!stream || stream.flushScheduled) return;
  stream.flushScheduled = true;

  const flush = (): void => {
    const current = streams.get(subscriptionId);
    if (!current) return;
    current.flushScheduled = false;
    if (current.hasPending) {
      current.onData(current.pendingPayload);
      current.hasPending = false;
      current.pendingPayload = undefined;
    }
  };

  const g = globalThis as typeof globalThis & {
    requestAnimationFrame?: (cb: () => void) => number;
  };
  if (typeof g.requestAnimationFrame === "function") {
    g.requestAnimationFrame(flush);
  } else {
    setTimeout(flush, 0);
  }
}

export class Bridge {
  private readonly pending = new Map<string, PendingEntry>();
  private readonly streams = new Map<string, StreamEntry>();
  private readonly eventHandlers = new Map<string, Set<(data: unknown) => void>>();
  private readonly transportUnsub: () => void;

  constructor(private readonly transport: BridgeTransport) {
    this.transportUnsub = transport.onReceive((msg) => this.handleInbound(msg));
  }

  /** Вызов нативного метода плагина → Promise. */
  invoke(plugin: string, method: string, args?: unknown, options?: InvokeOptions): Promise<unknown> {
    try {
      assertJsonSerializable(args ?? null);
    } catch (error) {
      return Promise.reject(error);
    }

    if (options?.stream) {
      return this.invokeStream(plugin, method, args, options);
    }

    const msg = createInvoke(plugin, method, args, { stream: false });
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    return new Promise((resolve, reject) => {
      const entry: PendingEntry = { resolve, reject };

      if (options?.signal) {
        if (options.signal.aborted) {
          reject(createBridgeError(BRIDGE_ERROR_CODES.CANCELLED, "Invoke cancelled"));
          return;
        }
        const onAbort = (): void => {
          this.pending.delete(msg.id);
          if (entry.timeoutId) clearTimeout(entry.timeoutId);
          this.transport.send(createCancel(msg.id));
          reject(createBridgeError(BRIDGE_ERROR_CODES.CANCELLED, "Invoke cancelled"));
        };
        entry.abortHandler = onAbort;
        options.signal.addEventListener("abort", onAbort, { once: true });
      }

      entry.timeoutId = setTimeout(() => {
        this.pending.delete(msg.id);
        reject(createBridgeError(BRIDGE_ERROR_CODES.TIMEOUT, `Invoke timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pending.set(msg.id, entry);
      this.transport.send(msg);
    });
  }

  /** Подписка на событие (native→JS или JS→native echo). */
  on(name: string, handler: (data: unknown) => void): () => void {
    if (!this.eventHandlers.has(name)) {
      this.eventHandlers.set(name, new Set());
    }
    this.eventHandlers.get(name)!.add(handler);
    return () => {
      this.off(name, handler);
    };
  }

  off(name: string, handler: (data: unknown) => void): void {
    this.eventHandlers.get(name)?.delete(handler);
  }

  /** Одноразовая подписка на событие. */
  once(name: string, handler: (data: unknown) => void): () => void {
    const wrapped = (data: unknown): void => {
      this.off(name, wrapped);
      handler(data);
    };
    return this.on(name, wrapped);
  }

  /** Эмит события JS→native. */
  emit(name: string, data?: unknown): void {
    try {
      assertJsonSerializable(data ?? null);
    } catch (error) {
      console.error("[aurobore-bridge] emit failed:", error);
      return;
    }
    this.transport.send({ type: "event", name, ...(data === undefined ? {} : { data }) });
  }

  destroy(): void {
    this.transportUnsub();
    for (const [, entry] of this.pending) {
      if (entry.timeoutId) clearTimeout(entry.timeoutId);
    }
    this.pending.clear();
    this.streams.clear();
    this.eventHandlers.clear();
  }

  private invokeStream(
    plugin: string,
    method: string,
    args: unknown,
    options: InvokeOptions,
  ): Promise<StreamSubscription> {
    const meta: { stream: true; maxFps?: number } = { stream: true };
    if (options.maxFps !== undefined) meta.maxFps = options.maxFps;
    const msg = createInvoke(plugin, method, args, meta);
    const subscriptionId = msg.id;
    const coalesce = options.streamCoalesce !== false;

    const sub: StreamSubscription = {
      subscriptionId,
      onData: () => {},
      onError: () => {},
      onComplete: () => {},
      stop: () => {},
    };

    this.streams.set(subscriptionId, {
      onData: (payload) => sub.onData(payload),
      onError: (error) => sub.onError(error),
      onComplete: () => sub.onComplete(),
      coalesce,
      hasPending: false,
      flushScheduled: false,
    });

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timeoutId = setTimeout(() => {
      if (this.streams.has(subscriptionId)) {
        this.streams.delete(subscriptionId);
        sub.onError(
          createBridgeError(BRIDGE_ERROR_CODES.TIMEOUT, `Stream timed out after ${timeoutMs}ms`),
        );
      }
    }, timeoutMs);

    const originalOnComplete = sub.onComplete;
    sub.onComplete = () => {
      clearTimeout(timeoutId);
      originalOnComplete();
    };

    const cleanupStream = (): void => {
      this.streams.delete(subscriptionId);
      clearTimeout(timeoutId);
      this.transport.send(createCancel(subscriptionId));
    };

    sub.stop = () => {
      cleanupStream();
    };

    if (options?.signal) {
      if (options.signal.aborted) {
        cleanupStream();
        return Promise.reject(createBridgeError(BRIDGE_ERROR_CODES.CANCELLED, "Invoke cancelled"));
      }
      options.signal.addEventListener(
        "abort",
        () => {
          cleanupStream();
          sub.onError(createBridgeError(BRIDGE_ERROR_CODES.CANCELLED, "Invoke cancelled"));
        },
        { once: true },
      );
    }

    this.transport.send(msg);
    return Promise.resolve(sub);
  }

  private handleInbound(msg: BridgeInbound): void {
    if (isResponseMessage(msg)) {
      const entry = this.pending.get(msg.id);
      if (!entry) return;
      this.pending.delete(msg.id);
      if (entry.timeoutId) clearTimeout(entry.timeoutId);
      if (msg.ok) {
        entry.resolve(msg.result);
      } else {
        entry.reject(msg.error ?? createBridgeError("BRIDGE_UNKNOWN", "Unknown bridge error"));
      }
      return;
    }

    if (isEventMessage(msg)) {
      this.dispatchEvent(msg.name, msg.data);
      return;
    }

    if (isStreamMessage(msg)) {
      const stream = this.streams.get(msg.subscriptionId);
      if (!stream) return;
      if (msg.phase === "data") {
        if (stream.coalesce) {
          stream.pendingPayload = msg.payload;
          stream.hasPending = true;
          scheduleStreamFlush(this.streams, msg.subscriptionId);
        } else {
          stream.onData(msg.payload);
        }
      } else if (msg.phase === "error") {
        if (stream.hasPending) {
          stream.hasPending = false;
          stream.pendingPayload = undefined;
        }
        stream.onError(msg.error ?? createBridgeError("BRIDGE_STREAM_ERROR", "Stream error"));
        this.streams.delete(msg.subscriptionId);
      } else if (msg.phase === "complete") {
        if (stream.hasPending) {
          stream.onData(stream.pendingPayload);
          stream.hasPending = false;
          stream.pendingPayload = undefined;
        }
        stream.onComplete();
        this.streams.delete(msg.subscriptionId);
      }
    }
  }

  private dispatchEvent(name: string, data?: unknown): void {
    this.emitToHandlers(name, data);
    if (name === "deeplink") {
      this.emitToHandlers("appurlopen", data);
    }
  }

  private emitToHandlers(name: string, data?: unknown): void {
    for (const handler of this.eventHandlers.get(name) ?? []) {
      try {
        handler(data);
      } catch (e) {
        console.error("[aurobore-bridge] event handler error:", e);
      }
    }
  }
}
