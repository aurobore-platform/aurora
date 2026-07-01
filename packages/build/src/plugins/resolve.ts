import { BRIDGE_PROTOCOL_VERSION } from "@aurobore/core";
import type { PluginManifest } from "../manifest/types.js";

export type PluginCompatStatus = "ok" | "warn" | "fail";

export interface PluginCompatResult {
  status: PluginCompatStatus;
  detail: string;
}

/** Проверяет совместимость манифеста с текущим runtime/протоколом. */
export function checkPluginCompat(manifest: PluginManifest): PluginCompatResult {
  const protocol = manifest.engineCompat?.bridgeProtocol;
  if (typeof protocol !== "number") {
    return { status: "fail", detail: "missing engineCompat.bridgeProtocol" };
  }
  if (protocol !== BRIDGE_PROTOCOL_VERSION) {
    return {
      status: "fail",
      detail: `bridgeProtocol ${protocol} != ${BRIDGE_PROTOCOL_VERSION}`,
    };
  }

  const runtime = manifest.engineCompat?.runtime;
  if (typeof runtime !== "string" || runtime.trim() === "") {
    return { status: "warn", detail: "missing engineCompat.runtime range" };
  }

  return { status: "ok", detail: "compatible" };
}
