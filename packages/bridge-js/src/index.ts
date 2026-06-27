/**
 * @aurobore/bridge-js — низкоуровневая JS-сторона моста (скелет M0).
 *
 * Реализация транспорта и корреляции по id появляется в M2 (см. docs/architecture/bridge.md).
 * Сейчас фиксируем только форму сообщений и генератор корреляционных id.
 */
import { BRIDGE_PROTOCOL_VERSION } from "@aurobore/core";

export interface InvokeMessage {
  type: "invoke";
  protocol: typeof BRIDGE_PROTOCOL_VERSION;
  id: string;
  plugin: string;
  method: string;
  args?: unknown;
  meta?: { stream?: boolean };
}

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
