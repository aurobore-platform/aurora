import { isAuroboreError, wrapBridgeError, resolveResourceUrl } from "@aurobore/core";
import { Camera } from "@aurobore/camera";
import { Echo } from "@aurobore/echo";

const status = document.getElementById("status")!;
const logEl = document.getElementById("log")!;
const preview = document.getElementById("preview") as HTMLImageElement;

function log(msg: string): void {
  logEl.textContent = msg;
}

function handleCameraError(err: unknown, action: string): void {
  const error = isAuroboreError(err)
    ? err
    : wrapBridgeError(err as { code: string; message: string });
  console.log(`[camera-demo] plugin OK: ${action} round-trip (${error.code})`);
  if (error.code === "CAMERA_UNAVAILABLE") {
    log(`${action} → ${error.code} (expected A3 stub)`);
  } else if (error.code === "CAMERA_CANCELLED") {
    log(`${action} → cancelled by user`);
  } else {
    log(`${action} → ${error.code}: ${error.message}`);
  }
}

async function capture(action: "getPhoto" | "pickPhoto"): Promise<void> {
  try {
    const photo =
      action === "getPhoto"
        ? await Camera.getPhoto({ quality: 80 })
        : await Camera.pickPhoto({});
    console.log(`[camera-demo] plugin OK: ${action} success`);
    const src = resolveResourceUrl(photo);
    preview.src = src;
    preview.hidden = false;
    log(`${action} → ${photo.url}\npreview: ${src}`);
  } catch (err) {
    handleCameraError(err, action);
    preview.hidden = true;
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

  document.getElementById("btn-get-photo")!.addEventListener("click", () => {
    void capture("getPhoto");
  });

  document.getElementById("btn-pick-photo")!.addEventListener("click", () => {
    void capture("pickPhoto");
  });
}

main();
