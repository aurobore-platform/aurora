<!-- AUTO-GENERATED from plugins/notifications/plugin.manifest — do not edit by hand -->

# Notifications

> Сгенерировано из `plugin.manifest`. Ручной справочник: [plugins/notifications.md](../../plugins/notifications.md).

**Пакет:** `@aurobore/notifications`  
**Разрешения:** Notifications

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `schedule` | `NotificationOptions` | `ScheduleResult` | — |
| `notify` | `NotificationOptions` | `ScheduleResult` | — |
| `cancel` | `CancelArgs` | — | — |
| `cancelAll` | `{}` | — | — |

## Типы

### `NotificationOptions`

| Поле | Тип |
|------|-----|
| `id` | `string?` |
| `title` | `string` |
| `body` | `string` |
| `scheduleAt` | `number?` |

### `CancelArgs`

| Поле | Тип |
|------|-----|
| `id` | `string` |

### `ScheduleResult`

| Поле | Тип |
|------|-----|
| `id` | `string` |

## События

| Событие | Payload | Описание |
|---------|---------|----------|
| `notification:tap` | `{ id: string, action: string }` | — |

## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `NOTIFICATIONS_UNAVAILABLE` | notifications not available | Нет локальных уведомлений на устройстве, D-Bus или сервис Nemo Notification недоступен |
| `NOTIFICATIONS_CANCELLED` | user cancelled | Пользователь отменил действие с уведомлением (UI-итерация) |
## Импорт

```typescript
import { Notifications } from "@aurobore/notifications";
```
