function log(el: HTMLElement, msg: string): void {
  el.textContent = msg;
}

function waitReady(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as { Aurobore?: unknown }).Aurobore) {
      resolve();
      return;
    }
    document.addEventListener("aurobore:ready", () => resolve(), { once: true });
    setTimeout(resolve, 2000);
  });
}

let mediaStream: MediaStream | null = null;

async function main(): Promise<void> {
  const status = document.getElementById("status")!;
  const geoLog = document.getElementById("geo-log")!;
  const clipLog = document.getElementById("clip-log")!;
  const preview = document.getElementById("preview") as HTMLVideoElement;

  await waitReady();
  status.textContent = "Ready — W3C APIs active";

  document.getElementById("btn-geo")!.addEventListener("click", () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        log(
          geoLog,
          `lat=${pos.coords.latitude}\nlng=${pos.coords.longitude}\nacc=${pos.coords.accuracy}m`,
        );
      },
      (err) => log(geoLog, `Error ${err.code}: ${err.message}`),
    );
  });

  document.getElementById("btn-share")!.addEventListener("click", async () => {
    try {
      await navigator.share({ title: "W3C Demo", text: "Hello from Aurobore polyfills" });
      status.textContent = "Shared";
    } catch (e) {
      status.textContent = String(e);
    }
  });

  document.getElementById("btn-notify")!.addEventListener("click", async () => {
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      new Notification("W3C Demo", { body: "Polyfill notification" });
    }
  });

  document.getElementById("btn-copy")!.addEventListener("click", async () => {
    await navigator.clipboard.writeText("hello");
    log(clipLog, "Copied «hello»");
  });

  document.getElementById("btn-paste")!.addEventListener("click", async () => {
    const text = await navigator.clipboard.readText();
    log(clipLog, `Paste: ${text}`);
  });

  document.getElementById("btn-camera")!.addEventListener("click", async () => {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      preview.srcObject = mediaStream;
      (document.getElementById("btn-stop-camera") as HTMLButtonElement).disabled = false;
    } catch (e) {
      status.textContent = String(e);
    }
  });

  document.getElementById("btn-stop-camera")!.addEventListener("click", () => {
    mediaStream?.getTracks().forEach((t) => t.stop());
    mediaStream = null;
    preview.srcObject = null;
    (document.getElementById("btn-stop-camera") as HTMLButtonElement).disabled = true;
  });
}

main().catch((e) => {
  document.getElementById("status")!.textContent = String(e);
});
