# Notifications (local)

Локальные уведомления: немедленные, по расписанию, отмена; событие нажатия.

**Пакет:** `@aurobore/notifications`  
**Разрешения:** `Notifications`

> **Статус A3 scaffold:** native-реализация — stub. Все методы возвращают `NOTIFICATIONS_UNAVAILABLE`. Реальные уведомления Авроры — следующая итерация.

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
| `id` | `string?` | Идентификатор (генерируется, если не задан) |
| `title` | `string` | Заголовок |
| `body` | `string` | Текст |
| `scheduleAt` | `number?` | Unix timestamp (мс) для `schedule` |

## События

| Событие | Payload | Описание |
|---------|---------|----------|
| `notification:tap` | `{ id: string; action?: string }` | Пользователь нажал на уведомление |

Подписка: `on("notification:tap", handler)` из `@aurobore/core` или `Aurobore.on(...)`.

## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `NOTIFICATIONS_UNAVAILABLE` | notifications not available | Stub-режим, нет уведомлений на устройстве |

Также возможны ошибки моста: `BRIDGE_PERMISSION_DENIED` (нет `Notifications` в granted permissions проекта).

## Пример

```typescript
import { Notifications } from "@aurobore/notifications";
import { isAuroboreError, on, wrapBridgeError } from "@aurobore/core";

on("notification:tap", (payload) => {
  console.log("tapped", payload.id);
});

try {
  await Notifications.notify({ title: "Hello", body: "A3 scaffold" });
} catch (err) {
  const error = isAuroboreError(err)
    ? err
    : wrapBridgeError(err as { code: string; message: string });
  if (error.code === "NOTIFICATIONS_UNAVAILABLE") {
    console.log("Notifications not available yet (A3 scaffold)");
  }
}
```

См. также [standard-plugins.md](standard-plugins.md) §3.
