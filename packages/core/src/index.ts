/**
 * @aurobore/core — публичный SDK Aurobore (скелет M0).
 *
 * На этапе M2 пакет содержит контракты протокола и ошибок. Публичный SDK-фасад для приложений
 * (lifecycle/events API, plugin wrappers) — M3/M5; см. docs/mvp-plan.md.
 */

export {
  BRIDGE_PROTOCOL_VERSION,
  createBridgeError,
  type BridgeError,
  type LifecycleEvent,
} from "./types.js";

export {
  BRIDGE_CHANNEL,
  BRIDGE_ERROR_CODES,
  createCancel,
  createEvent,
  createResponse,
  createStream,
  isBridgeMessage,
  isEventMessage,
  isInvokeMessage,
  isResponseMessage,
  isStreamMessage,
} from "./protocol.js";

export type {
  BridgeErrorCode,
  BridgeInbound,
  BridgeMessage,
  BridgeOutbound,
  CancelMessage,
  EventMessage,
  InvokeMessage,
  ResponseMessage,
  StreamMessage,
  StreamPhase,
} from "./protocol.js";
