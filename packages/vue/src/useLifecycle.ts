import { onMounted, onUnmounted, ref, type Ref } from "vue";
import type { LifecycleEvent } from "@aurobore/core";
import { subscribeLifecycle } from "./lifecycle.js";

export function useLifecycle(): { event: Ref<LifecycleEvent | null> } {
  const event = ref<LifecycleEvent | null>(null);
  let unsub: (() => void) | null = null;

  onMounted(() => {
    unsub = subscribeLifecycle((e) => {
      event.value = e;
    });
  });

  onUnmounted(() => {
    unsub?.();
  });

  return { event };
}
