import { getAurobore } from "@aurobore/core";
import { catchAurobore } from "./errors.js";

const notificationMap = new Map<string, PolyfillNotification>();

class PolyfillNotification {
  readonly title: string;
  readonly body: string;
  readonly tag: string;
  readonly data: unknown;
  readonly dir = "auto" as NotificationDirection;
  readonly lang = "";
  readonly icon = "";
  readonly badge = "";
  readonly image = "";
  readonly requireInteraction = false;
  readonly silent = false;
  readonly timestamp = Date.now();
  readonly vibrate: readonly number[] = [];
  readonly actions: ReadonlyArray<{ action: string; title: string; icon?: string }> = [];
  onclick: ((this: Notification, ev: Event) => unknown) | null = null;
  onshow: ((this: Notification, ev: Event) => unknown) | null = null;
  onerror: ((this: Notification, ev: Event) => unknown) | null = null;
  onclose: ((this: Notification, ev: Event) => unknown) | null = null;

  private id: string;

  constructor(title: string, options?: NotificationOptions) {
    this.title = title;
    this.body = options?.body ?? "";
    this.tag = options?.tag ?? "";
    this.data = options?.data;
    this.id = options?.tag || `n-${Date.now()}`;

    catchAurobore(async () => {
      const result = (await getAurobore().invoke("Notifications", "notify", {
        id: this.id,
        title: this.title,
        body: this.body,
      })) as { id: string };
      this.id = result.id;
      notificationMap.set(this.id, this);
      this.onshow?.call(this as unknown as Notification, new Event("show"));
    }).catch((e) => {
      this.onerror?.call(this as unknown as Notification, e as Event);
    });
  }

  close(): void {
    catchAurobore(() => getAurobore().invoke("Notifications", "cancel", { id: this.id })).finally(
      () => {
        notificationMap.delete(this.id);
        this.onclose?.call(this as unknown as Notification, new Event("close"));
      },
    );
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return false;
  }
}

export function installNotificationPolyfill(): void {
  const g = globalThis as typeof globalThis & { Notification?: typeof Notification };
  if (typeof g.Notification === "function" && g.Notification.permission !== undefined) {
    const proto = g.Notification.prototype;
    if (proto && typeof proto.close === "function") return;
  }

  const NotificationCtor = PolyfillNotification as unknown as typeof Notification;
  Object.defineProperty(NotificationCtor, "permission", {
    value: "granted" as NotificationPermission,
    writable: false,
  });
  NotificationCtor.requestPermission = () => Promise.resolve("granted" as NotificationPermission);

  g.Notification = NotificationCtor;
}
