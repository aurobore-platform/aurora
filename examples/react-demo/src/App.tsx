import { useCallback, useEffect, useState } from "react";
import { isAuroboreError } from "@aurobore/core";
import { useLifecycle } from "@aurobore/react";
import { Echo } from "@aurobore/echo";
import { Device } from "@aurobore/device";

export function App() {
  const [status, setStatus] = useState("Loading…");
  const { event: lifecycleEvent } = useLifecycle();

  useEffect(() => {
    (async () => {
      try {
        const ping = await Echo.ping({});
        const info = await Device.getInfo({});
        setStatus(`Echo pong=${ping.pong}, device=${info.model}`);
        document.dispatchEvent(new CustomEvent("aurobore:ready"));
      } catch (err) {
        setStatus(isAuroboreError(err) ? `${err.code}: ${err.message}` : String(err));
      }
    })();
  }, []);

  const onPing = useCallback(async () => {
    try {
      const result = await Echo.ping({});
      setStatus(`ping → pong=${result.pong}, ts=${result.ts}`);
    } catch (err) {
      setStatus(String(err));
    }
  }, []);

  const onEcho = useCallback(async () => {
    try {
      const result = await Echo.echo({ hello: "Aurobore" });
      setStatus(`echo → ${JSON.stringify(result)}`);
    } catch (err) {
      setStatus(String(err));
    }
  }, []);

  return (
    <main>
      <h1>React Demo</h1>
      <p id="status">{status}</p>
      <div className="actions">
        <button type="button" onClick={onPing}>
          Echo ping
        </button>
        <button type="button" onClick={onEcho}>
          Echo echo
        </button>
      </div>
      <p className="muted">Lifecycle: {lifecycleEvent ?? "—"}</p>
    </main>
  );
}
