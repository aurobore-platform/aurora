import { isAuroboreError, wrapBridgeError } from "@aurobore/core";
import { Echo } from "@aurobore/echo";
import { Share } from "@aurobore/share";

const status = document.getElementById("status")!;
const logEl = document.getElementById("log")!;

function log(msg: string): void {
  logEl.textContent = msg;
}

function handleShareError(err: unknown, action: string): void {
  const error = isAuroboreError(err)
    ? err
    : wrapBridgeError(err as { code: string; message: string });
  console.log(`[share-demo] plugin OK: ${action} round-trip (${error.code})`);
  if (error.code === "SHARE_CANCELLED") {
    log(`${action} → cancelled by user`);
  } else if (error.code === "SHARE_UNAVAILABLE") {
    log(`${action} → ${error.code} (share sheet not available)`);
  } else {
    log(`${action} → ${error.code}: ${error.message}`);
  }
}

async function main(): Promise<void> {
  try {
    const ping = await Echo.ping({});
    status.textContent = ping.pong ? "Bridge ready" : "Echo ping failed";
    document.dispatchEvent(new CustomEvent("aurobore:ready"));
  } catch (err) {
    status.textContent = isAuroboreError(err) ? err.message : String(err);
  }

  document.getElementById("btn-share-text")!.addEventListener("click", async () => {
    try {
      await Share.shareText({
        text: "Hello from Aurobore Share demo",
        title: "Greeting",
      });
      console.log("[share-demo] plugin OK: shareText success");
      log("shareText → done");
    } catch (err) {
      handleShareError(err, "shareText");
    }
  });

  document.getElementById("btn-share-url")!.addEventListener("click", async () => {
    try {
      await Share.shareUrl({
        url: "https://auroraos.ru/",
        title: "Aurora OS",
      });
      console.log("[share-demo] plugin OK: shareUrl success");
      log("shareUrl → done");
    } catch (err) {
      handleShareError(err, "shareUrl");
    }
  });

  document.getElementById("btn-share-file")!.addEventListener("click", async () => {
    try {
      const resource = await Echo.getSampleResource();
      await Share.shareFile({
        kind: resource.kind,
        url: resource.url,
        mimeType: resource.mimeType,
        title: "Sample file",
      });
      console.log("[share-demo] plugin OK: shareFile success");
      log(`shareFile → done\n${resource.url}`);
    } catch (err) {
      handleShareError(err, "shareFile");
    }
  });
}

main();
