import { describe, expect, it } from "vitest";
import { parseManifest } from "../manifest/parse.js";
import { generateJsWrapper, generateNativeRegistry, generatePluginBundle, generateTypes } from "./generate.js";

const echoManifest = parseManifest({
  manifestVersion: 1,
  name: "echo",
  display: "Echo",
  version: "1.0.0",
  engineCompat: { runtime: ">=0.1.0", bridgeProtocol: 1 },
  types: { PingResult: { pong: "boolean", ts: "number" } },
  methods: {
    ping: { args: {}, result: "PingResult" },
    watchTicks: { args: {}, result: "void", stream: true },
  },
});

describe("codegen", () => {
  it("генерирует JS-обёртку Echo", () => {
    const js = generateJsWrapper(echoManifest);
    expect(js).toContain("@generated");
    expect(js).toContain('import { getAurobore } from "@aurobore/core"');
    expect(js).toContain('getAurobore().invoke("Echo", "ping"');
    expect(js).toContain("stream: true");
  });

  it("генерирует .d.ts", () => {
    const dts = generateTypes(echoManifest);
    expect(dts).toContain("interface PingResult");
    expect(dts).toContain("EchoApi");
  });

  it("генерирует native registry", () => {
    const { header, source } = generateNativeRegistry([echoManifest]);
    expect(header).toContain("PluginRegistry");
    expect(header).toContain("createEchoPlugin");
    expect(source).toContain("createEchoPlugin(router)");
    expect(source).toContain('QStringLiteral("ping")');
  });

  it("включает scopes в native registry", () => {
    const fsManifest = parseManifest({
      manifestVersion: 1,
      name: "filesystem",
      display: "FileSystem",
      version: "1.0.0",
      engineCompat: { runtime: ">=0.1.0", bridgeProtocol: 1 },
      scopes: ["appData"],
      methods: { readText: { args: { path: "string" }, result: "void" } },
    });
    const { source } = generateNativeRegistry([fsManifest]);
    expect(source).toContain('QStringLiteral("appData")');
  });

  it("генерирует plugin bundle", () => {
    const bundle = generatePluginBundle([echoManifest]);
    expect(bundle).toContain("A.__plugins");
    expect(bundle).toContain("A.Echo");
  });
});
