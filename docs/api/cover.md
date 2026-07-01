# Cover API (обложка)

Обложка — нативное представление приложения на домашнем экране ОС Аврора, когда приложение работает в фоне.

Aurobore **всегда** предоставляет формальную обложку: имя приложения из `app.name` в конфиге. Динамический статус и кнопки быстрых действий — **опционально**, только если вы их явно настроили.

## По умолчанию (без кода)

Ничего делать не нужно. На дашборде отображается шаблонная обложка с именем приложения.

## Декларативные actions (конфиг)

В [`aurobore.config.json`](../architecture/configuration.md) можно задать статические кнопки:

```json
{
  "cover": {
    "actions": [
      { "id": "refresh", "label": "Обновить", "icon": "icon-m-sync" }
    ]
  }
}
```

- Не более **4** actions.
- `id` — стабильный идентификатор для обработчика в JS (`a-z`, цифры, `_`, `-`).
- `icon` — имя иконки из темы Silica (опционально).

## Runtime API (`@aurobore/core`)

```typescript
import { cover, on } from "@aurobore/core";

await cover.setState({
  primaryText: "Сейчас играет",
  secondaryText: "Artist — Track",
});

await cover.setActions([
  { id: "toggle", label: "Пауза", icon: "icon-m-play" },
]);

const off = cover.onAction(({ id }) => {
  if (id === "toggle") togglePlayback();
});

await cover.reset(); // имя приложения + actions из конфига
```

### Методы

| Метод | Описание |
|---|---|
| `cover.setState(state)` | Обновить `primaryText` / `secondaryText` (частичное обновление) |
| `cover.setActions(actions)` | Заменить список кнопок на обложке |
| `cover.reset()` | Вернуть значения по умолчанию |
| `cover.onAction(handler)` | Подписка на нажатие кнопки; возвращает функцию отписки |

Нативный plugin id: **`Cover`**. Методы моста: `setState`, `setActions`, `reset`.

## События

| Событие | Направление | Описание |
|---|---|---|
| `cover:action` | native → JS | Нажата кнопка на обложке; payload: `{ id: string }` |
| `cover:active` | native → JS | Обложка видна на домашнем экране |
| `cover:inactive` | native → JS | Обложка скрыта |

Подписка на `cover:action` также через `Aurobore.on("cover:action", …)` или `cover.onAction()`.

Если приложение в фоне (`pause`), события action могут быть **отложены** до `resume`.

## Рекомендации

- Обновляйте `setState` на `pause` или при `cover:active`, а не в tight loop.
- Не пытайтесь рендерить WebView/HTML на обложке — только нативный шаблон.
- Для типичных SPA без фоновых задач достаточно формальной обложки.

## Пример: медиаплеер

```typescript
import { cover, on } from "@aurobore/core";

let playing = false;

on("pause", () => {
  void cover.setState({
    primaryText: playing ? "▶ Воспроизведение" : "⏸ Пауза",
    secondaryText: currentTrack.title,
  });
  void cover.setActions([
    {
      id: "toggle",
      label: playing ? "Пауза" : "Play",
      icon: playing ? "icon-m-pause" : "icon-m-play",
    },
  ]);
});

cover.onAction(({ id }) => {
  if (id === "toggle") {
    playing = !playing;
  }
});
```

## Вне scope v1

- `cover.mode: "preview"` (скриншот WebView) — отдельная задача.
- Кастомный QML (`cover.customQml`) — для продвинутых нативных сценариев.

См. также: [tutorial: обложка](../tutorials/cover.md), [runtime § обложка](../architecture/runtime.md).
