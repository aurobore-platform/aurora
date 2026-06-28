import { on, once, isAuroboreError } from "@aurobore/core";
import { Echo } from "@aurobore/echo";
import { Device } from "@aurobore/device";

const status = document.getElementById("status")!;
const lifecycle = document.getElementById("lifecycle")!;

function setStatus(text: string): void {
  status.textContent = text;
}

function appendLifecycle(event: string): void {
  lifecycle.textContent = `Lifecycle: ${event}`;
}

async function main(): Promise<void> {
  once("ready", () => appendLifecycle("ready"));

  on("pause", () => appendLifecycle("pause"));
  on("resume", () => appendLifecycle("resume"));

  try {
    const ping = await Echo.ping({});
    const info = await Device.getInfo({});
    setStatus(`Echo pong=${ping.pong}, device=${info.model}`);
    document.dispatchEvent(new CustomEvent("aurobore:ready"));
  } catch (err) {
    setStatus(isAuroboreError(err) ? `${err.code}: ${err.message}` : String(err));
  }

  document.getElementById("btn-ping")!.addEventListener("click", async () => {
    try {
      const result = await Echo.ping({});
      setStatus(`ping → pong=${result.pong}, ts=${result.ts}`);
    } catch (err) {
      setStatus(String(err));
    }
  });

  document.getElementById("btn-echo")!.addEventListener("click", async () => {
    try {
      const result = await Echo.echo({ hello: "Aurobore" });
      setStatus(`echo → ${JSON.stringify(result)}`);
    } catch (err) {
      setStatus(String(err));
    }
  });
}

main();
