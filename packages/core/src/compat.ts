import { BRIDGE_PROTOCOL_VERSION } from "./types.js";

export interface BridgeProtocolCheckResult {
  ok: boolean;
  expected: number;
  actual?: number;
  message?: string;
}

/**
 * Проверяет совместимость версии протокола моста (FR-S1).
 * `actual` берётся из `globalThis.Aurobore.__protocolVersion`, если доступен.
 */
export function checkBridgeProtocol(
  expected: number = BRIDGE_PROTOCOL_VERSION,
): BridgeProtocolCheckResult {
  const g = globalThis as { Aurobore?: { __protocolVersion?: number } };
  const actual = g.Aurobore?.__protocolVersion;

  if (actual === undefined) {
    return {
      ok: true,
      expected,
      message: "Bridge protocol version not reported by runtime; assuming compatible",
    };
  }

  if (actual !== expected) {
    return {
      ok: false,
      expected,
      actual,
      message: `Bridge protocol mismatch: runtime=${actual}, SDK expects=${expected}`,
    };
  }

  return { ok: true, expected, actual };
}
