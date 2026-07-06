import { getAurobore } from "@aurobore/core";
import { catchAurobore } from "./errors.js";

function needsClipboardPolyfill(): boolean {
  const c = navigator.clipboard;
  if (!c) return true;
  return typeof c.readText !== "function" || typeof c.writeText !== "function";
}

export function installClipboardPolyfill(): void {
  if (!needsClipboardPolyfill()) return;

  const clipboard = {
    writeText(text: string) {
      return catchAurobore(() =>
        getAurobore().invoke("Clipboard", "copy", { text }) as Promise<void>,
      );
    },
    readText() {
      return catchAurobore(async () => {
        const result = (await getAurobore().invoke("Clipboard", "paste", {})) as { text: string };
        return result.text ?? "";
      });
    },
  };

  Object.defineProperty(navigator, "clipboard", {
    value: clipboard,
    configurable: true,
    writable: true,
  });
}
