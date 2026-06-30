/**
 * @aurobore/core — публичный SDK Aurobore.
 *
 * Протокол/ошибки моста (M2), plugin wrappers через @aurobore/<plugin> (M3),
 * lifecycle/events API (M5).
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

export {
  assertBridgeReady,
  bindAurobore,
  emit,
  getAurobore,
  invoke,
  off,
  on,
  once,
  type AuroboreBridge,
  type InvokeOptions,
  type StreamSubscription,
} from "./aurobore.js";

export {
  AuroboreError,
  CancelledError,
  InvalidArgsError,
  MethodNotFoundError,
  PermissionDeniedError,
  PluginNotFoundError,
  ProtocolMismatchError,
  TimeoutError,
  isAuroboreError,
  wrapBridgeError,
} from "./errors.js";

export { checkBridgeProtocol, type BridgeProtocolCheckResult } from "./compat.js";

export {
  APP_DATA_URL_PREFIX,
  RESOURCE_REF_KIND,
  createResourceRef,
  isResourceRef,
  resolveResourceUrl,
  type ResourceRef,
} from "./resource.js";
