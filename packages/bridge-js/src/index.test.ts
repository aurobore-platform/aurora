import { describe, expect, it } from "vitest";
import { createInvoke, nextCallId } from "./index.js";

describe("@aurobore/bridge-js", () => {
  it("nextCallId выдаёт уникальные id", () => {
    expect(nextCallId()).not.toBe(nextCallId());
  });

  it("createInvoke формирует корректное сообщение invoke", () => {
    const msg = createInvoke("Device", "getInfo", { verbose: true });
    expect(msg.type).toBe("invoke");
    expect(msg.protocol).toBe(1);
    expect(msg.plugin).toBe("Device");
    expect(msg.method).toBe("getInfo");
    expect(msg.args).toEqual({ verbose: true });
    expect(msg.id).toMatch(/^c-\d+$/);
  });
});
