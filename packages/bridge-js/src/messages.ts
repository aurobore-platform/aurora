/**
 * Форма сообщений invoke и генератор корреляционных id.
 */
import { BRIDGE_PROTOCOL_VERSION, type InvokeMessage } from "@aurobore/core";

export { BRIDGE_PROTOCOL_VERSION };

export type { InvokeMessage };

let counter = 0;

/** Возвращает уникальный корреляционный id вызова (см. docs/architecture/bridge.md §3). */
export function nextCallId(): string {
  counter += 1;
  return `c-${counter}`;
}

export function createInvoke(
  plugin: string,
  method: string,
  args?: unknown,
  meta?: { stream?: boolean },
): InvokeMessage {
  return {
    type: "invoke",
    protocol: BRIDGE_PROTOCOL_VERSION,
    id: nextCallId(),
    plugin,
    method,
    ...(args === undefined ? {} : { args }),
    ...(meta === undefined ? {} : { meta }),
  };
}

/** Сброс счётчика id (только для тестов). */
export function resetCallIdCounter(): void {
  counter = 0;
}
