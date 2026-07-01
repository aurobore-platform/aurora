import { describe, expect, it } from "vitest";
import { formatReport, runDoctor } from "./doctor.js";

describe("@aurobore/cli doctor", () => {
  it("проверяет окружение и всегда включает Node, pnpm, Aurora SDK", async () => {
    const report = await runDoctor();
    const names = report.checks.map((c) => c.name);
    expect(names.some((n) => n.startsWith("Node"))).toBe(true);
    expect(names.some((n) => n.startsWith("pnpm"))).toBe(true);
    expect(names.some((n) => n.startsWith("Aurobore runtime"))).toBe(true);
    expect(names.some((n) => n.startsWith("Aurora SDK"))).toBe(true);
    expect(names.some((n) => n.startsWith("Docker"))).toBe(true);
    expect(names.some((n) => n.startsWith("aurobore.config"))).toBe(true);
    expect(names.some((n) => n.startsWith("App icons"))).toBe(true);
    expect(names.some((n) => n.startsWith("SFDK target"))).toBe(true);
    expect(names.some((n) => n.startsWith("Dev host"))).toBe(true);
    expect(names.some((n) => n.startsWith("Dev server port"))).toBe(true);
    expect(names.some((n) => n.startsWith("Emulator SSH"))).toBe(true);
    expect(names.some((n) => n.startsWith("Dev permissions"))).toBe(true);
  });

  it("Node-проверка проходит (тесты идут на поддерживаемой версии)", async () => {
    const node = (await runDoctor()).checks.find((c) => c.name.startsWith("Node"));
    expect(node?.status).toBe("ok");
  });

  it("formatReport выводит человекочитаемый отчёт", async () => {
    const text = formatReport(await runDoctor());
    expect(text).toMatch(/Node\.js/);
    expect(text).toMatch(/\[ OK \]|\[WARN\]|\[FAIL\]/);
  });
});
