import { AuroboreError } from "./errors.js";
import type { LifecycleEvent } from "./types.js";

export interface InvokeOptions {
  stream?: boolean;
  /** Native throttle (Hz) для stream invoke; см. invoke.meta.maxFps. */
  maxFps?: number;
  /** JS coalescing latest-wins для phase:data (default true, FR-B8). */
  streamCoalesce?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface StreamSubscription {
  subscriptionId: string;
  onData: (payload: unknown) => void;
  onError: (error: import("./types.js").BridgeError) => void;
  onComplete: () => void;
  stop: () => void;
}

/** Контракт низкоуровневого моста (инъекция из runtime или тестов). */
export interface AuroboreBridge {
  invoke(plugin: string, method: string, args?: unknown, options?: InvokeOptions): Promise<unknown>;
  on(name: string, handler: (data: unknown) => void): () => void;
  off(name: string, handler: (data: unknown) => void): void;
  once?(name: string, handler: (data: unknown) => void): () => void;
  emit(name: string, data?: unknown): void;
}

type GlobalAurobore = AuroboreBridge & { __protocolVersion?: number };

let boundBridge: AuroboreBridge | null = null;

/** Подменяет мост (unit-тесты без WebView). */
export function bindAurobore(bridge: AuroboreBridge | null): void {
  boundBridge = bridge;
}

function resolveBridge(): AuroboreBridge {
  if (boundBridge) return boundBridge;
  const g = globalThis as { Aurobore?: GlobalAurobore };
  if (!g.Aurobore) {
    throw new AuroboreError(
      "BRIDGE_NOT_READY",
      "Aurobore bridge is not available. Run inside the Aurobore runtime or call bindAurobore() in tests.",
    );
  }
  return g.Aurobore;
}

/** Возвращает активный мост (runtime global или bound). */
export function getAurobore(): AuroboreBridge {
  return resolveBridge();
}

/** Проверяет, что мост доступен. */
export function assertBridgeReady(): void {
  resolveBridge();
}

export function invoke(
  plugin: string,
  method: string,
  args?: unknown,
  options?: InvokeOptions,
): Promise<unknown> {
  return resolveBridge().invoke(plugin, method, args, options);
}

export function on(name: LifecycleEvent | string, handler: (data: unknown) => void): () => void {
  return resolveBridge().on(name, handler);
}

export function off(name: LifecycleEvent | string, handler: (data: unknown) => void): void {
  resolveBridge().off(name, handler);
}

/** Одноразовая подписка на событие. */
export function once(name: LifecycleEvent | string, handler: (data: unknown) => void): () => void {
  const bridge = resolveBridge();
  if (bridge.once) {
    return bridge.once(name, handler);
  }
  let off: (() => void) | undefined;
  const wrapped = (data: unknown): void => {
    off?.();
    handler(data);
  };
  off = bridge.on(name, wrapped);
  return () => off?.();
}

export function emit(name: string, data?: unknown): void {
  resolveBridge().emit(name, data);
}
