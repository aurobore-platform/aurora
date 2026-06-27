/**
 * Протокол моста JS ↔ native (см. docs/architecture/bridge.md §2).
 */
import { BRIDGE_PROTOCOL_VERSION, type BridgeError } from "./types.js";

/** Имя канала WebView для JSON-сообщений протокола. */
export const BRIDGE_CHANNEL = "aurobore:bridge" as const;

/** Коды ошибок транспорта/протокола (пространство BRIDGE_*). */
export const BRIDGE_ERROR_CODES = {
  PROTOCOL_MISMATCH: "BRIDGE_PROTOCOL_MISMATCH",
  PLUGIN_NOT_FOUND: "BRIDGE_PLUGIN_NOT_FOUND",
  METHOD_NOT_FOUND: "BRIDGE_METHOD_NOT_FOUND",
  INVALID_ARGS: "BRIDGE_INVALID_ARGS",
  TIMEOUT: "BRIDGE_TIMEOUT",
  PERMISSION_DENIED: "BRIDGE_PERMISSION_DENIED",
  CANCELLED: "BRIDGE_CANCELLED",
} as const;

export type BridgeErrorCode = (typeof BRIDGE_ERROR_CODES)[keyof typeof BRIDGE_ERROR_CODES];

export interface InvokeMessage {
  type: "invoke";
  protocol: typeof BRIDGE_PROTOCOL_VERSION;
  id: string;
  plugin: string;
  method: string;
  args?: unknown;
  meta?: { stream?: boolean };
}

export interface ResponseMessage {
  type: "response";
  id: string;
  ok: boolean;
  result?: unknown;
  error?: BridgeError;
}

export interface EventMessage {
  type: "event";
  name: string;
  data?: unknown;
}

export type StreamPhase = "data" | "error" | "complete";

export interface StreamMessage {
  type: "stream";
  subscriptionId: string;
  phase: StreamPhase;
  payload?: unknown;
  error?: BridgeError;
}

export interface CancelMessage {
  type: "cancel";
  id: string;
}

export type BridgeInbound = ResponseMessage | EventMessage | StreamMessage;
export type BridgeOutbound = InvokeMessage | EventMessage | CancelMessage;
export type BridgeMessage = BridgeInbound | BridgeOutbound;

export function createResponse(id: string, ok: boolean, payload: unknown): ResponseMessage {
  if (ok) {
    return { type: "response", id, ok: true, result: payload };
  }
  return { type: "response", id, ok: false, error: payload as BridgeError };
}

export function createEvent(name: string, data?: unknown): EventMessage {
  return { type: "event", name, ...(data === undefined ? {} : { data }) };
}

export function createStream(
  subscriptionId: string,
  phase: StreamPhase,
  payload?: unknown,
  error?: BridgeError,
): StreamMessage {
  const msg: StreamMessage = { type: "stream", subscriptionId, phase };
  if (payload !== undefined) msg.payload = payload;
  if (error !== undefined) msg.error = error;
  return msg;
}

export function createCancel(id: string): CancelMessage {
  return { type: "cancel", id };
}

export function isBridgeMessage(value: unknown): value is BridgeOutbound | BridgeInbound {
  if (typeof value !== "object" || value === null || !("type" in value)) return false;
  const t = (value as { type: string }).type;
  return (
    t === "invoke" ||
    t === "response" ||
    t === "event" ||
    t === "stream" ||
    t === "cancel"
  );
}

export function isInvokeMessage(value: unknown): value is InvokeMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as InvokeMessage).type === "invoke" &&
    (value as InvokeMessage).protocol === BRIDGE_PROTOCOL_VERSION
  );
}

export function isResponseMessage(value: unknown): value is ResponseMessage {
  return typeof value === "object" && value !== null && (value as ResponseMessage).type === "response";
}

export function isEventMessage(value: unknown): value is EventMessage {
  return typeof value === "object" && value !== null && (value as EventMessage).type === "event";
}

export function isStreamMessage(value: unknown): value is StreamMessage {
  return typeof value === "object" && value !== null && (value as StreamMessage).type === "stream";
}
