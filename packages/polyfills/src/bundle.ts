import { installPolyfills } from "./index.js";
import { POLYFILL_IDS, type PolyfillId } from "./types.js";

/** Читает выбранный набор из data-polyfills тега скрипта (CSV); undefined → дефолт. */
function resolveOnlyFromScript(): PolyfillId[] | undefined {
  const current = document.currentScript as HTMLScriptElement | null;
  const raw = current?.dataset?.polyfills;
  if (!raw) return undefined;
  const valid = new Set<string>(POLYFILL_IDS);
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => valid.has(s)) as PolyfillId[];
  return ids.length > 0 ? ids : undefined;
}

const only = resolveOnlyFromScript();

installPolyfills(only ? { only } : {}).catch((err) => {
  console.error("[aurobore-polyfills] bootstrap failed:", err);
});
