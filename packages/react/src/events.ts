import { on } from "@aurobore/core";

/** Подписка на произвольное событие моста; возвращает отписку. */
export function subscribeAuroboreEvent(
  name: string,
  handler: (data: unknown) => void,
): () => void {
  return on(name, handler);
}
