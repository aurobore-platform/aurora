export interface MockBridgeError {
  code: string;
  message: string;
  data?: unknown;
}

export interface MockStreamSpec {
  /** Payload per tick (1-based index). */
  payload: (tick: number) => unknown;
  count: number;
  /** Delay between ticks in ms; 0 = burst in one microtask. */
  intervalMs: number;
}

export type MockDispatchResult =
  | { type: "ok"; result: unknown }
  | { type: "error"; error: MockBridgeError }
  | { type: "stream"; stream: MockStreamSpec }
  | { type: "not-found" };
