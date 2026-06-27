/**
 * @aurobore/core — публичный SDK Aurobore (скелет M0).
 *
 * На этапе M0 пакет содержит только базовые контракты, общие для JS-стороны моста
 * и инструментария. Реализация наполняется в M2 (Bridge) и M5 (SDK).
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
