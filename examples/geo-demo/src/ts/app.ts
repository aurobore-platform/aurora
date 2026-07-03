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
const btnClearWatch = document.getElementById("btn-clear-watch") as HTMLButtonElement;

let activeWatch: StreamSubscription | null = null;

function log(msg: string): void {
  logEl.textContent = msg;
}

function formatPosition(pos: {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}): string {
  const lines = [
    `${pos.latitude.toFixed(6)}, ${pos.longitude.toFixed(6)}`,
    `accuracy: ${pos.accuracy != null ? `${pos.accuracy.toFixed(1)} m` : "n/a"}`,
    `timestamp: ${new Date(pos.timestamp).toISOString()}`,
  ];
  return lines.join("\n");
}

function handleGeoError(err: unknown, action: string): void {
  const error = isAuroboreError(err)
    ? err
    : wrapBridgeError(err as { code: string; message: string });
  console.log(`[geo-demo] plugin OK: ${action} round-trip (${error.code})`);
  if (error.code === "GEOLOCATION_UNAVAILABLE") {
    log(`${action} → ${error.code} (no GPS fix or emulator without positioning)`);
  } else if (error.code === "GEOLOCATION_CANCELLED") {
    log(`${action} → cancelled`);
  } else {
    log(`${action} → ${error.code}: ${error.message}`);
  }
}

function resetWatchUi(): void {
  activeWatch = null;
  btnStop.disabled = true;
  btnClearWatch.disabled = true;
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
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 30_000,
      });
      console.log("[geo-demo] plugin OK: getCurrentPosition success");
      log(`getCurrentPosition →\n${formatPosition(pos)}`);
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
      btnClearWatch.disabled = false;
      console.log("[geo-demo] plugin OK: watch stream started");
      log(`watch → stream started (id: ${sub.subscriptionId})`);
      sub.onData = (payload) => {
        const pos = payload as {
          latitude: number;
          longitude: number;
          accuracy?: number;
          timestamp: number;
        };
        log(`watch data →\n${formatPosition(pos)}`);
      };
      sub.onError = (err) => {
        const error = isAuroboreError(err)
          ? err
          : wrapBridgeError(err as { code: string; message: string });
        console.log(`[geo-demo] plugin OK: watch error (${error.code})`);
        log(`watch error → ${error.code}: ${error.message}`);
        resetWatchUi();
      };
      sub.onComplete = () => {
        log("watch → complete");
        resetWatchUi();
      };
    } catch (err) {
      handleGeoError(err, "watch");
    }
  });

  btnStop.addEventListener("click", () => {
    activeWatch?.stop();
    resetWatchUi();
    log("watch → stopped via sub.stop()");
  });

  btnClearWatch.addEventListener("click", async () => {
    if (!activeWatch) return;
    const watchId = activeWatch.subscriptionId;
    try {
      await Geolocation.clearWatch({ watchId });
      console.log("[geo-demo] plugin OK: clearWatch");
      resetWatchUi();
      log(`clearWatch → stopped (watchId: ${watchId})`);
    } catch (err) {
      handleGeoError(err, "clearWatch");
    }
  });
}

main();
