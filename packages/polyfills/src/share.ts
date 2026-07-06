import { getAurobore } from "@aurobore/core";
import { catchAurobore, domException } from "./errors.js";

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

function canShareHeuristic(data?: ShareData): boolean {
  if (!data) return true;
  if (data.files && data.files.length > 0) return true;
  if (data.url) return true;
  if (data.text) return true;
  if (data.title) return true;
  return false;
}

async function shareViaPlugin(data: ShareData): Promise<void> {
  const title = data.title;
  if (data.files && data.files.length > 0) {
    const file = data.files[0]!;
    const url = URL.createObjectURL(file);
    try {
      await getAurobore().invoke("Share", "shareFile", {
        kind: "blob",
        url,
        mimeType: file.type || undefined,
        title,
      });
    } finally {
      URL.revokeObjectURL(url);
    }
    return;
  }
  if (data.url) {
    await getAurobore().invoke("Share", "shareUrl", { url: data.url, title });
    return;
  }
  if (data.text) {
    await getAurobore().invoke("Share", "shareText", { text: data.text, title });
    return;
  }
  if (data.title) {
    await getAurobore().invoke("Share", "shareText", { text: data.title, title });
    return;
  }
  throw domException("NotAllowedError", "Share data is empty");
}

export function installSharePolyfill(): void {
  const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
  if (typeof nav.share === "function") return;

  nav.share = (data) => catchAurobore(() => shareViaPlugin(data ?? {}));
  (nav as Navigator & { canShare?: (data?: ShareData) => boolean }).canShare = (data) =>
    canShareHeuristic(data);
}
