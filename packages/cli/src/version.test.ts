import { describe, expect, it } from "vitest";
import { readCliVersion } from "./version.js";

describe("cli version", () => {
  it("readCliVersion возвращает semver из package.json", () => {
    const version = readCliVersion();
    expect(version).toBe("0.0.3");
  });
});
