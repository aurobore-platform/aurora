import { on, type LifecycleEvent } from "@aurobore/core";

const LIFECYCLE_EVENTS: LifecycleEvent[] = ["ready", "pause", "resume"];

export function subscribeLifecycle(handler: (event: LifecycleEvent) => void): () => void {
  const unsubs = LIFECYCLE_EVENTS.map((event) => on(event, () => handler(event)));
  return () => {
    for (const unsub of unsubs) unsub();
  };
}
