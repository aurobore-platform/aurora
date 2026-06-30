import { describe, expect, it } from "vitest";
import {
  BRIDGE_CHANNEL,
  BRIDGE_ERROR_CODES,
  BRIDGE_PROTOCOL_VERSION,
  createBridgeError,
  createEvent,
  createResponse,
  createStream,
  isBridgeMessage,
  isInvokeMessage,
} from "./index.js";

describe("@aurobore/core protocol", () => {
  it("экспортирует BRIDGE_CHANNEL", () => {
    expect(BRIDGE_CHANNEL).toBe("aurobore:bridge");
  });

  it("createResponse формирует ok и error ответы", () => {
    expect(createResponse("c-1", true, { pong: true })).toEqual({
      type: "response",
      id: "c-1",
      ok: true,
      result: { pong: true },
    });
    const err = createBridgeError(BRIDGE_ERROR_CODES.TIMEOUT, "timed out");
    expect(createResponse("c-2", false, err)).toEqual({
      type: "response",
      id: "c-2",
      ok: false,
      error: err,
    });
  });

  it("createEvent и createStream", () => {
    expect(createEvent("pause", { ts: 1 })).toEqual({
      type: "event",
      name: "pause",
      data: { ts: 1 },
    });
    expect(createStream("s-1", "data", { tick: 1 })).toEqual({
      type: "stream",
      subscriptionId: "s-1",
      phase: "data",
      payload: { tick: 1 },
    });
  });

  it("BRIDGE_ERROR_CODES включает scope denied", () => {
    expect(BRIDGE_ERROR_CODES.SCOPE_DENIED).toBe("BRIDGE_SCOPE_DENIED");
  });

  it("isBridgeMessage и isInvokeMessage", () => {
    const invoke = {
      type: "invoke" as const,
      protocol: BRIDGE_PROTOCOL_VERSION,
      id: "c-1",
      plugin: "Echo",
      method: "ping",
    };
    expect(isBridgeMessage(invoke)).toBe(true);
    expect(isInvokeMessage(invoke)).toBe(true);
    expect(isBridgeMessage(null)).toBe(false);
  });
});
