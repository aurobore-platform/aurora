import { describe, expect, it } from "vitest";
import { BRIDGE_PROTOCOL_VERSION, createBridgeError } from "./index.js";

describe("@aurobore/core", () => {
  it("экспортирует версию протокола моста", () => {
    expect(BRIDGE_PROTOCOL_VERSION).toBe(1);
  });

  it("createBridgeError собирает структуру ошибки", () => {
    expect(createBridgeError("BRIDGE_TIMEOUT", "timed out")).toEqual({
      code: "BRIDGE_TIMEOUT",
      message: "timed out",
    });
    expect(createBridgeError("X_FAIL", "msg", { a: 1 })).toEqual({
      code: "X_FAIL",
      message: "msg",
      data: { a: 1 },
    });
  });
});
