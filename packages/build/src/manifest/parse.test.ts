import { describe, expect, it } from "vitest";
import { parseManifest, validateManifest } from "./parse.js";

const validEcho = {
  manifestVersion: 1,
  name: "echo",
  display: "Echo",
  version: "1.0.0",
  engineCompat: { runtime: ">=0.1.0", bridgeProtocol: 1 },
  permissions: [],
  types: {
    PingResult: { pong: "boolean", ts: "number" },
  },
  methods: {
    ping: { args: {}, result: "PingResult" },
    echo: { args: "object", result: "object" },
    fail: { args: {}, result: "void" },
    watchTicks: { args: {}, result: "void", stream: true },
  },
};

describe("manifest parse", () => {
  it("принимает валидный Echo-манифест", () => {
    expect(validateManifest(validEcho)).toEqual([]);
    const parsed = parseManifest(validEcho);
    expect(parsed.display).toBe("Echo");
    expect(parsed.methods.watchTicks?.stream).toBe(true);
  });

  it("отклоняет unknown fields", () => {
    const errors = validateManifest({ ...validEcho, extra: true });
    expect(errors.some((e) => e.path === "extra")).toBe(true);
  });

  it("отклоняет неизвестный type reference", () => {
    const errors = validateManifest({
      ...validEcho,
      methods: { ping: { args: {}, result: "MissingType" } },
    });
    expect(errors.some((e) => e.message.includes("unknown type reference"))).toBe(true);
  });

  it("отклоняет неподдерживаемый manifestVersion", () => {
    const errors = validateManifest({ ...validEcho, manifestVersion: 2 });
    expect(errors.some((e) => e.path === "manifestVersion")).toBe(true);
  });

  it("принимает errors с message и description", () => {
    const withErrors = {
      ...validEcho,
      errors: {
        ECHO_TEST_ERROR: {
          message: "demo error",
          description: "Thrown by fail()",
        },
      },
    };
    expect(validateManifest(withErrors)).toEqual([]);
    const parsed = parseManifest(withErrors);
    expect(parsed.errors?.ECHO_TEST_ERROR?.message).toBe("demo error");
  });

  it("отклоняет error без message", () => {
    const errors = validateManifest({
      ...validEcho,
      errors: { ECHO_TEST_ERROR: { description: "x" } },
    });
    expect(errors.some((e) => e.path === "errors.ECHO_TEST_ERROR.message")).toBe(true);
  });

  it("отклоняет невалидный код ошибки", () => {
    const errors = validateManifest({
      ...validEcho,
      errors: { "echo_bad": { message: "bad" } },
    });
    expect(errors.some((e) => e.path === "errors.echo_bad")).toBe(true);
  });
});
