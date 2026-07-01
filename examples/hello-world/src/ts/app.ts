import { on, once, isAuroboreError, wrapBridgeError, type StreamSubscription } from "@aurobore/core";
import { Echo } from "@aurobore/echo";
import { Device } from "@aurobore/device";

const status = document.getElementById("status")!;
const logEl = document.getElementById("log")!;
const deviceEl = document.getElementById("device")!;
const lifecycleEl = document.getElementById("lifecycle")!;
const benchEl = document.getElementById("bench")!;
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

  document.getElementById("btn-bench")!.addEventListener("click", async () => {
    benchEl.textContent = "Running…";
    const samples: number[] = [];
    const count = 100;
    try {
      for (let i = 0; i < count; i++) {
        const t0 = performance.now();
        await Echo.ping({});
        samples.push(performance.now() - t0);
      }
      samples.sort((a, b) => a - b);
      const median = samples[Math.floor(samples.length / 2)]!;
      const p95 = samples[Math.floor(samples.length * 0.95)]!;

      let streamTicks = 0;
      const sub = (await Echo.watchTicks({})) as StreamSubscription;
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          sub.stop();
          resolve();
        }, 5000);
        const done = () => {
          clearTimeout(timeout);
          resolve();
        };
        sub.onData = () => {
          streamTicks++;
          if (streamTicks >= 5) {
            sub.stop();
            done();
          }
        };
        sub.onError = () => done();
        sub.onComplete = () => done();
      });

      const summary = `ping n=${count}\nmedian=${median.toFixed(2)} ms\np95=${p95.toFixed(2)} ms\nstream ticks=${streamTicks}`;
      benchEl.textContent = summary;
      console.log(`[hello-world] bench: ${summary.replace(/\n/g, "; ")}`);
    } catch (err) {
      benchEl.textContent = String(err);
    }
  });
}

main();
