import { useEffect, useState } from "react";
import type { LifecycleEvent } from "@aurobore/core";
import { subscribeLifecycle } from "./lifecycle.js";

export function useLifecycle(): { event: LifecycleEvent | null } {
  const [event, setEvent] = useState<LifecycleEvent | null>(null);

  useEffect(() => subscribeLifecycle(setEvent), []);

  return { event };
}
