import { describe, expect, it } from "vitest";
import { BRIDGE_ERROR_CODES } from "./protocol.js";
import { createBridgeError } from "./types.js";
import {
  AuroboreError,
  CancelledError,
  InvalidArgsError,
  PermissionDeniedError,
  PluginNotFoundError,
  TimeoutError,
  isAuroboreError,
  wrapBridgeError,
} from "./errors.js";

describe("SDK errors", () => {
  it("wrapBridgeError маппит коды в классы", () => {
    expect(wrapBridgeError(createBridgeError(BRIDGE_ERROR_CODES.PERMISSION_DENIED, "denied"))).toBeInstanceOf(
      PermissionDeniedError,
    );
    expect(wrapBridgeError(createBridgeError(BRIDGE_ERROR_CODES.TIMEOUT, "timed out"))).toBeInstanceOf(
      TimeoutError,
    );
    expect(wrapBridgeError(createBridgeError(BRIDGE_ERROR_CODES.CANCELLED, "cancelled"))).toBeInstanceOf(
      CancelledError,
    );
    expect(wrapBridgeError(createBridgeError(BRIDGE_ERROR_CODES.PLUGIN_NOT_FOUND, "missing"))).toBeInstanceOf(
      PluginNotFoundError,
    );
    expect(wrapBridgeError(createBridgeError(BRIDGE_ERROR_CODES.INVALID_ARGS, "bad"))).toBeInstanceOf(
      InvalidArgsError,
    );
    expect(wrapBridgeError(createBridgeError("CUSTOM_CODE", "msg"))).toBeInstanceOf(AuroboreError);
  });

  it("isAuroboreError распознаёт экземпляры", () => {
    expect(isAuroboreError(new AuroboreError("X", "y"))).toBe(true);
    expect(isAuroboreError({ code: "X", message: "y" })).toBe(false);
  });

  it("AuroboreError.fromBridgeError делегирует в wrapBridgeError", () => {
    const err = AuroboreError.fromBridgeError(createBridgeError(BRIDGE_ERROR_CODES.TIMEOUT, "t"));
    expect(err).toBeInstanceOf(TimeoutError);
    expect(err.code).toBe(BRIDGE_ERROR_CODES.TIMEOUT);
  });
});
