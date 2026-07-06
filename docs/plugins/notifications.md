# Notifications (local)

Локальные уведомления: немедленные, по расписанию, отмена; событие нажатия.

**Пакет:** `@aurobore/notifications`  
**Разрешения:** `Notifications`

Native: Nemo `Notification` API (`nemonotifications-qt5`) + D-Bus `remoteAction` для tap из шторки.

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `notify` | `NotificationOptions` | `{ id: string }` | Немедленное уведомление |
| `schedule` | `NotificationOptions` (с `scheduleAt`) | `{ id: string }` | Уведомление по расписанию |
| `cancel` | `{ id: string }` | `void` | Отмена по id |
| `cancelAll` | `{}` | `void` | Отмена всех |

## Типы

### `NotificationOptions`

| Поле | Тип | Описание |
|------|-----|----------|
| `id` | `string?` | Идентификатор (генерируется UUID, если не задан) |
| `title` | `string` | Заголовок (`summary` в Nemo) |
| `body` | `string` | Текст |
| `scheduleAt` | `number?` | Unix timestamp (мс) для `schedule` |

## События

| Событие | Payload | Описание |
|---------|---------|----------|
| `notification:tap` | `{ id: string; action?: string }` | Пользователь нажал на уведомление |

Подписка: `on("notification:tap", handler)` из `@aurobore/core` или `Aurobore.on(...)`.

Tap доставляется при активации из шторки (D-Bus `remoteAction`) или когда приложение на переднем плане (`actionInvoked` / `clicked`). События, пришедшие до `aurobore:ready`, ставятся в очередь и доставляются после загрузки WebView.

## Ограничения (Alpha+)

| Сценарий | Поведение |
|----------|-----------|
| `schedule` | Таймер **в процессе приложения** (`QTimer`); не сработает, если процесс убит |
| Tap из шторки | Требует живой процесс + permission `Notifications`; wake из killed — best-effort |
| Push / action buttons | Вне scope P4 |

## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-----|
| `NOTIFICATIONS_UNAVAILABLE` | notifications not available | Нет сервиса уведомлений, D-Bus недоступен, пустые `title`/`body` |
| `NOTIFICATIONS_CANCELLED` | user cancelled | Зарезервировано для UI-итерации |

Также возможны ошибки моста: `BRIDGE_PERMISSION_DENIED` (нет `Notifications` в granted permissions проекта).

## Пример

```typescript
import { Notifications } from "@aurobore/notifications";
import { isAuroboreError, on, wrapBridgeError } from "@aurobore/core";

on("notification:tap", (payload) => {
  console.log("tapped", payload.id, payload.action);
});

try {
  const { id } = await Notifications.notify({ title: "Hello", body: "P4 native" });
  console.log("shown", id);
} catch (err) {
  const error = isAuroboreError(err)
    ? err
    : wrapBridgeError(err as { code: string; message: string });
  if (error.code === "NOTIFICATIONS_UNAVAILABLE") {
    console.log("Notifications unavailable");
  }
}
```

Демо: [`examples/notifications-demo/`](../../examples/notifications-demo/).

См. также [standard-plugins.md](standard-plugins.md) §3.
