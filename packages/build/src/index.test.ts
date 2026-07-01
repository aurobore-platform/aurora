import { describe, expect, it } from "vitest";
import { isAuroraArch } from "./index.js";

describe("@aurobore/build", () => {
  it("распознаёт поддерживаемые архитектуры Аврора", () => {
    expect(isAuroraArch("aarch64")).toBe(true);
    expect(isAuroraArch("armv7hl")).toBe(true);
    expect(isAuroraArch("x86_64")).toBe(true);
    expect(isAuroraArch("mips")).toBe(false);
  });
});
