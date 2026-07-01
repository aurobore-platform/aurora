import {
  isAuroboreError,
  wrapBridgeError,
  type StreamSubscription,
} from "@aurobore/core";
import { Geolocation } from "@aurobore/geolocation";
import { Echo } from "@aurobore/echo";

const status = document.getElementById("status")!;
const logEl = document.getElementById("log")!;
const btnStop = document.getElementById("btn-stop") as HTMLButtonElement;

let activeWatch: StreamSubscription | null = null;

function log(msg: string): void {
  logEl.textContent = msg;
}

function handleGeoError(err: unknown, action: string): void {
  const error = isAuroboreError(err)
    ? err
    : wrapBridgeError(err as { code: string; message: string });
  console.log(`[geo-demo] plugin OK: ${action} round-trip (${error.code})`);
  if (error.code === "GEOLOCATION_UNAVAILABLE") {
    log(`${action} → ${error.code} (expected A3 stub)`);
  } else if (error.code === "GEOLOCATION_CANCELLED") {
    log(`${action} → cancelled`);
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

  document.getElementById("btn-get-position")!.addEventListener("click", async () => {
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      console.log("[geo-demo] plugin OK: getCurrentPosition success");
      log(
        `getCurrentPosition → ${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}\naccuracy: ${pos.accuracy ?? "n/a"} m`,
      );
    } catch (err) {
      handleGeoError(err, "getCurrentPosition");
    }
  });

  document.getElementById("btn-watch")!.addEventListener("click", async () => {
    if (activeWatch) return;
    try {
      const sub = (await Geolocation.watch({ enableHighAccuracy: true })) as StreamSubscription;
      activeWatch = sub;
      btnStop.disabled = false;
      console.log("[geo-demo] plugin OK: watch stream started");
      log("watch → stream started");
      sub.onData = (payload) => {
        const pos = payload as { latitude: number; longitude: number };
        log(`watch data → ${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`);
      };
      sub.onError = (err) => {
        const error = isAuroboreError(err)
          ? err
          : wrapBridgeError(err as { code: string; message: string });
        console.log(`[geo-demo] plugin OK: watch error (${error.code})`);
        log(`watch error → ${error.code}: ${error.message}`);
        activeWatch = null;
        btnStop.disabled = true;
      };
      sub.onComplete = () => {
        log("watch → complete");
        activeWatch = null;
        btnStop.disabled = true;
      };
    } catch (err) {
      handleGeoError(err, "watch");
    }
  });

  btnStop.addEventListener("click", () => {
    activeWatch?.stop();
    activeWatch = null;
    btnStop.disabled = true;
    log("watch → stopped by user");
  });
}

main();
