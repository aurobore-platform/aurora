import { onMounted, onUnmounted, ref, type Ref } from "vue";
import { subscribeAuroboreEvent } from "./events.js";

export function useAuroboreEvent<T = unknown>(name: string, handler: (data: T) => void): void;
export function useAuroboreEvent<T = unknown>(name: string): Ref<T | undefined>;
export function useAuroboreEvent<T = unknown>(
  name: string,
  handler?: (data: T) => void,
): Ref<T | undefined> | void {
  const data = ref<T | undefined>(undefined);
  let unsub: (() => void) | null = null;

  onMounted(() => {
    unsub = subscribeAuroboreEvent(name, (payload) => {
      if (handler) {
        handler(payload as T);
      } else {
        data.value = payload as T;
      }
    });
  });

  onUnmounted(() => {
    unsub?.();
  });

  if (handler) return;
  return data as Ref<T | undefined>;
}
