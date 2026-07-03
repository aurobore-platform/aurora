import {
  isAuroboreError,
  on,
  wrapBridgeError,
} from "@aurobore/core";
import { Echo } from "@aurobore/echo";
import { Notifications } from "@aurobore/notifications";

const status = document.getElementById("status")!;
const logEl = document.getElementById("log")!;
const btnCancelLast = document.getElementById("btn-cancel-last") as HTMLButtonElement;
const btnCancelAll = document.getElementById("btn-cancel-all") as HTMLButtonElement;

const activeIds: string[] = [];

function log(msg: string): void {
  logEl.textContent = msg;
}

function updateCancelButtons(): void {
  const hasAny = activeIds.length > 0;
  btnCancelLast.disabled = !hasAny;
  btnCancelAll.disabled = !hasAny;
}

function handleNotifError(err: unknown, action: string): void {
  const error = isAuroboreError(err)
    ? err
    : wrapBridgeError(err as { code: string; message: string });
  console.log(`[notifications-demo] plugin OK: ${action} round-trip (${error.code})`);
  if (error.code === "NOTIFICATIONS_UNAVAILABLE") {
    log(`${action} → ${error.code} (notification service unavailable)`);
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

  on("notification:tap", (payload) => {
    const data = payload as { id?: string; action?: string };
    const id = data.id ?? "(unknown)";
    const action = data.action ?? "default";
    console.log("[notifications-demo] plugin OK: notification:tap", id, action);
    log(`notification:tap → id: ${id}\naction: ${action}`);
  });

  document.getElementById("btn-notify")!.addEventListener("click", async () => {
    try {
      const result = await Notifications.notify({
        title: "Aurobore",
        body: `Immediate notification ${new Date().toLocaleTimeString()}`,
      });
      activeIds.push(result.id);
      updateCancelButtons();
      console.log("[notifications-demo] plugin OK: notify", result.id);
      log(`notify → id: ${result.id}`);
    } catch (err) {
      handleNotifError(err, "notify");
    }
  });

  document.getElementById("btn-schedule")!.addEventListener("click", async () => {
    try {
      const scheduleAt = Date.now() + 5_000;
      const result = await Notifications.schedule({
        title: "Aurobore",
        body: `Scheduled notification ${new Date(scheduleAt).toLocaleTimeString()}`,
        scheduleAt,
      });
      activeIds.push(result.id);
      updateCancelButtons();
      console.log("[notifications-demo] plugin OK: schedule", result.id);
      log(`schedule → id: ${result.id}\nfires at: ${new Date(scheduleAt).toLocaleTimeString()}`);
    } catch (err) {
      handleNotifError(err, "schedule");
    }
  });

  btnCancelLast.addEventListener("click", async () => {
    const id = activeIds.pop();
    if (!id) return;
    try {
      await Notifications.cancel({ id });
      updateCancelButtons();
      console.log("[notifications-demo] plugin OK: cancel", id);
      log(`cancel → id: ${id}`);
    } catch (err) {
      handleNotifError(err, "cancel");
    }
  });

  btnCancelAll.addEventListener("click", async () => {
    try {
      await Notifications.cancelAll({});
      activeIds.length = 0;
      updateCancelButtons();
      console.log("[notifications-demo] plugin OK: cancelAll");
      log("cancelAll → done");
    } catch (err) {
      handleNotifError(err, "cancelAll");
    }
  });
}

main();
