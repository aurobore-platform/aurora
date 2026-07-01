import { on } from "@aurobore/core";

export function subscribeAuroboreEvent(
  name: string,
  handler: (data: unknown) => void,
): () => void {
  return on(name, handler);
}
