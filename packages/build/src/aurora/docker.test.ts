import { describe, expect, it } from "vitest";
import { isMsysShell, probeDockerDaemon } from "./docker.js";

describe("isMsysShell", () => {
  it("detects MSYSTEM", () => {
    const prev = process.env.MSYSTEM;
    process.env.MSYSTEM = "MINGW64";
    expect(isMsysShell()).toBe(true);
    if (prev === undefined) delete process.env.MSYSTEM;
    else process.env.MSYSTEM = prev;
  });
});

describe("probeDockerDaemon", () => {
  it("fails fast in MSYS without calling docker", () => {
    const prev = process.env.MSYSTEM;
    process.env.MSYSTEM = "MINGW64";
    const result = probeDockerDaemon();
    expect(result.status).toBe("fail");
    expect(result.detail).toMatch(/MSYS|PowerShell/i);
    if (prev === undefined) delete process.env.MSYSTEM;
    else process.env.MSYSTEM = prev;
  });
});
