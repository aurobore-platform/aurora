import { on } from "@aurobore/core";
import { readable, type Readable } from "svelte/store";
import type { LifecycleEvent } from "@aurobore/core";
import { subscribeLifecycle } from "./lifecycle.js";

export const lifecycle: Readable<LifecycleEvent | null> = readable<LifecycleEvent | null>(
  null,
  (set) => subscribeLifecycle(set),
);

export function useLifecycle(): { event: Readable<LifecycleEvent | null> } {
  return { event: lifecycle };
}

export function auroboreEventStore<T = unknown>(name: string): Readable<T | undefined> {
  return readable<T | undefined>(undefined, (set) => on(name, (data) => set(data as T)));
}

export function useAuroboreEvent<T = unknown>(name: string): Readable<T | undefined>;
export function useAuroboreEvent<T = unknown>(
  name: string,
  handler: (data: T) => void,
): { subscribe: () => () => void };
export function useAuroboreEvent<T = unknown>(
  name: string,
  handler?: (data: T) => void,
): Readable<T | undefined> | { subscribe: () => () => void } {
  if (handler) {
    return {
      subscribe: () => on(name, (data) => handler(data as T)),
    };
  }
  return auroboreEventStore<T>(name);
}
