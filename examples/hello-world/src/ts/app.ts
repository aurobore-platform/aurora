import { on, once, isAuroboreError, wrapBridgeError, type StreamSubscription } from "@aurobore/core";
import { Echo } from "@aurobore/echo";
import { Device } from "@aurobore/device";

const status = document.getElementById("status")!;
const logEl = document.getElementById("log")!;
const deviceEl = document.getElementById("device")!;
const lifecycleEl = document.getElementById("lifecycle")!;
const btnStop = document.getElementById("btn-stop") as HTMLButtonElement;

let activeStream: StreamSubscription | null = null;

function log(msg: string): void {
  logEl.textContent = msg;
}

function addLifecycle(event: string): void {
  const li = document.createElement("li");
  li.textContent = `${new Date().toISOString().slice(11, 19)} — ${event}`;
  lifecycleEl.prepend(li);
}

async function main(): Promise<void> {
  once("ready", () => addLifecycle("ready (once)"));
  on("pause", () => addLifecycle("pause"));
  on("resume", () => addLifecycle("resume"));

  try {
    const ping = await Echo.ping({});
    status.textContent = ping.pong ? "Bridge ready" : "Echo ping failed";
    document.dispatchEvent(new CustomEvent("aurobore:ready"));
  } catch (err) {
    status.textContent = isAuroboreError(err) ? err.message : String(err);
  }

  document.getElementById("btn-ping")!.addEventListener("click", async () => {
    try {
      const r = await Echo.ping({});
      log(`ping → pong=${r.pong}, ts=${r.ts}`);
    } catch (err) {
      log(String(err));
    }
  });

  document.getElementById("btn-echo")!.addEventListener("click", async () => {
    try {
      const r = await Echo.echo({ text: "Hello Aurobore" });
      log(`echo → ${JSON.stringify(r)}`);
    } catch (err) {
      log(String(err));
    }
  });

  document.getElementById("btn-fail")!.addEventListener("click", async () => {
    try {
      await Echo.fail({});
      log("fail → unexpected success");
    } catch (err) {
      const wrapped = isAuroboreError(err)
        ? err
        : wrapBridgeError(err as { code: string; message: string; data?: unknown });
      log(`fail → ${wrapped.code}: ${wrapped.message}`);
    }
  });

  document.getElementById("btn-stream")!.addEventListener("click", async () => {
    if (activeStream) return;
    const ticks: number[] = [];
    try {
      const sub = (await Echo.watchTicks({})) as StreamSubscription;
      activeStream = sub;
      btnStop.disabled = false;
      sub.onData = (payload) => {
        const tick = (payload as { tick: number }).tick;
        ticks.push(tick);
        log(`stream tick ${tick} (${ticks.join(", ")})`);
      };
      sub.onError = (err) => {
        log(`stream error: ${err.message}`);
        activeStream = null;
        btnStop.disabled = true;
      };
      sub.onComplete = () => {
        log(`stream complete: [${ticks.join(", ")}]`);
        activeStream = null;
        btnStop.disabled = true;
      };
    } catch (err) {
      log(String(err));
    }
  });

  btnStop.addEventListener("click", () => {
    activeStream?.stop();
    activeStream = null;
    btnStop.disabled = true;
    log("stream stopped by user");
  });

  document.getElementById("btn-device")!.addEventListener("click", async () => {
    try {
      const info = await Device.getInfo({});
      deviceEl.textContent = JSON.stringify(info, null, 2);
    } catch (err) {
      deviceEl.textContent = String(err);
    }
  });
}

main();
