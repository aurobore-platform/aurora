/** Версия протокола моста JS <-> native (см. docs/architecture/bridge.md §2). */
export const BRIDGE_PROTOCOL_VERSION = 1 as const;

/** Единая структура ошибки моста (см. docs/architecture/bridge.md §8). */
export interface BridgeError {
  code: string;
  message: string;
  data?: unknown;
}

export function createBridgeError(code: string, message: string, data?: unknown): BridgeError {
  return { code, message, ...(data === undefined ? {} : { data }) };
}

/** Системные события жизненного цикла (см. docs/architecture/runtime.md §5). */
export type LifecycleEvent =
  | "ready"
  | "pause"
  | "resume"
  | "backbutton"
  | "memoryWarning"
  | "orientationchange"
  | "destroy";
