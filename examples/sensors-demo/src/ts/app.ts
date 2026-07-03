import {
  isAuroboreError,
  wrapBridgeError,
  type StreamSubscription,
} from "@aurobore/core";
import { Echo } from "@aurobore/echo";
import { Sensors } from "@aurobore/sensors";

const status = document.getElementById("status")!;
const logAccel = document.getElementById("log-accel")!;
const logGyro = document.getElementById("log-gyro")!;
const btnAccelStop = document.getElementById("btn-accel-stop") as HTMLButtonElement;
const btnGyroStop = document.getElementById("btn-gyro-stop") as HTMLButtonElement;

let activeAccel: StreamSubscription | null = null;
let activeGyro: StreamSubscription | null = null;

interface SensorReading {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

function formatReading(reading: SensorReading): string {
  return [
    `x: ${reading.x.toFixed(4)}`,
    `y: ${reading.y.toFixed(4)}`,
    `z: ${reading.z.toFixed(4)}`,
    `timestamp: ${new Date(reading.timestamp).toISOString()}`,
  ].join("\n");
}

function handleSensorError(
  err: unknown,
  sensor: string,
  logEl: HTMLElement,
  reset: () => void,
): void {
  const error = isAuroboreError(err)
    ? err
    : wrapBridgeError(err as { code: string; message: string });
  console.log(`[sensors-demo] plugin OK: ${sensor} round-trip (${error.code})`);
  if (error.code === "SENSORS_UNAVAILABLE") {
    logEl.textContent = `${sensor} → ${error.code} (no IMU or emulator)`;
  } else {
    logEl.textContent = `${sensor} → ${error.code}: ${error.message}`;
  }
  reset();
}

async function main(): Promise<void> {
  try {
    const ping = await Echo.ping({});
    status.textContent = ping.pong ? "Bridge ready" : "Echo ping failed";
    document.dispatchEvent(new CustomEvent("aurobore:ready"));
  } catch (err) {
    status.textContent = isAuroboreError(err) ? err.message : String(err);
  }

  document.getElementById("btn-accel-start")!.addEventListener("click", async () => {
    if (activeAccel) return;
    try {
      const sub = (await Sensors.watchAccelerometer()) as StreamSubscription;
      activeAccel = sub;
      btnAccelStop.disabled = false;
      console.log("[sensors-demo] plugin OK: watchAccelerometer stream started");
      logAccel.textContent = `accel → stream started (id: ${sub.subscriptionId})`;
      sub.onData = (payload) => {
        logAccel.textContent = `accel data →\n${formatReading(payload as SensorReading)}`;
      };
      sub.onError = (err) => {
        handleSensorError(err, "accel", logAccel, () => {
          activeAccel = null;
          btnAccelStop.disabled = true;
        });
      };
      sub.onComplete = () => {
        logAccel.textContent = "accel → complete";
        activeAccel = null;
        btnAccelStop.disabled = true;
      };
    } catch (err) {
      handleSensorError(err, "accel", logAccel, () => {
        activeAccel = null;
        btnAccelStop.disabled = true;
      });
    }
  });

  btnAccelStop.addEventListener("click", () => {
    activeAccel?.stop();
    activeAccel = null;
    btnAccelStop.disabled = true;
    logAccel.textContent = "accel → stopped via sub.stop()";
  });

  document.getElementById("btn-gyro-start")!.addEventListener("click", async () => {
    if (activeGyro) return;
    try {
      const sub = (await Sensors.watchGyroscope()) as StreamSubscription;
      activeGyro = sub;
      btnGyroStop.disabled = false;
      console.log("[sensors-demo] plugin OK: watchGyroscope stream started");
      logGyro.textContent = `gyro → stream started (id: ${sub.subscriptionId})`;
      sub.onData = (payload) => {
        logGyro.textContent = `gyro data →\n${formatReading(payload as SensorReading)}`;
      };
      sub.onError = (err) => {
        handleSensorError(err, "gyro", logGyro, () => {
          activeGyro = null;
          btnGyroStop.disabled = true;
        });
      };
      sub.onComplete = () => {
        logGyro.textContent = "gyro → complete";
        activeGyro = null;
        btnGyroStop.disabled = true;
      };
    } catch (err) {
      handleSensorError(err, "gyro", logGyro, () => {
        activeGyro = null;
        btnGyroStop.disabled = true;
      });
    }
  });

  btnGyroStop.addEventListener("click", () => {
    activeGyro?.stop();
    activeGyro = null;
    btnGyroStop.disabled = true;
    logGyro.textContent = "gyro → stopped via sub.stop()";
  });
}

main();
