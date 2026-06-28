import { BRIDGE_ERROR_CODES } from "./protocol.js";
import type { BridgeError } from "./types.js";

/** Базовая ошибка SDK Aurobore (FR-S3). */
export class AuroboreError extends Error {
  readonly code: string;
  readonly data?: unknown;

  constructor(code: string, message: string, data?: unknown) {
    super(message);
    this.name = "AuroboreError";
    this.code = code;
    if (data !== undefined) this.data = data;
  }

  static fromBridgeError(err: BridgeError): AuroboreError {
    return wrapBridgeError(err);
  }
}

export class PermissionDeniedError extends AuroboreError {
  constructor(message: string, data?: unknown) {
    super(BRIDGE_ERROR_CODES.PERMISSION_DENIED, message, data);
    this.name = "PermissionDeniedError";
  }
}

export class TimeoutError extends AuroboreError {
  constructor(message: string, data?: unknown) {
    super(BRIDGE_ERROR_CODES.TIMEOUT, message, data);
    this.name = "TimeoutError";
  }
}

export class CancelledError extends AuroboreError {
  constructor(message: string, data?: unknown) {
    super(BRIDGE_ERROR_CODES.CANCELLED, message, data);
    this.name = "CancelledError";
  }
}

export class PluginNotFoundError extends AuroboreError {
  constructor(message: string, data?: unknown) {
    super(BRIDGE_ERROR_CODES.PLUGIN_NOT_FOUND, message, data);
    this.name = "PluginNotFoundError";
  }
}

export class MethodNotFoundError extends AuroboreError {
  constructor(message: string, data?: unknown) {
    super(BRIDGE_ERROR_CODES.METHOD_NOT_FOUND, message, data);
    this.name = "MethodNotFoundError";
  }
}

export class InvalidArgsError extends AuroboreError {
  constructor(message: string, data?: unknown) {
    super(BRIDGE_ERROR_CODES.INVALID_ARGS, message, data);
    this.name = "InvalidArgsError";
  }
}

export class ProtocolMismatchError extends AuroboreError {
  constructor(message: string, data?: unknown) {
    super(BRIDGE_ERROR_CODES.PROTOCOL_MISMATCH, message, data);
    this.name = "ProtocolMismatchError";
  }
}

/** Преобразует структурированную ошибку моста в типизированный класс SDK. */
export function wrapBridgeError(err: BridgeError): AuroboreError {
  switch (err.code) {
    case BRIDGE_ERROR_CODES.PERMISSION_DENIED:
      return new PermissionDeniedError(err.message, err.data);
    case BRIDGE_ERROR_CODES.TIMEOUT:
      return new TimeoutError(err.message, err.data);
    case BRIDGE_ERROR_CODES.CANCELLED:
      return new CancelledError(err.message, err.data);
    case BRIDGE_ERROR_CODES.PLUGIN_NOT_FOUND:
      return new PluginNotFoundError(err.message, err.data);
    case BRIDGE_ERROR_CODES.METHOD_NOT_FOUND:
      return new MethodNotFoundError(err.message, err.data);
    case BRIDGE_ERROR_CODES.INVALID_ARGS:
      return new InvalidArgsError(err.message, err.data);
    case BRIDGE_ERROR_CODES.PROTOCOL_MISMATCH:
      return new ProtocolMismatchError(err.message, err.data);
    default:
      return new AuroboreError(err.code, err.message, err.data);
  }
}

export function isAuroboreError(value: unknown): value is AuroboreError {
  return value instanceof AuroboreError;
}
