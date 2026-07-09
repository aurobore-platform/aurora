# События и lifecycle

Подписки на системные события runtime и стримы плагинов.

## API событий

Из `@aurobore/core`:

```typescript
import { on, once, off, emit } from "@aurobore/core";

// постоянная подписка
const unsubscribe = on("pause", () => {
  console.log("app paused");
});

// одноразовая
once("ready", () => {
  console.log("runtime ready");
});

// отписка
unsubscribe();
// или
off("pause", handler);
```

`on` и `once` возвращают функцию отписки.

## Системные события (lifecycle)

| Событие | Направление | Описание |
|---|---|---|
| `ready` | native → JS | Runtime и мост готовы |
| `pause` | native → JS | Приложение ушло в фон |
| `resume` | native → JS | Возврат на передний план |
| `backbutton` | native → JS | Аппаратная «назад» |
| `memoryWarning` | native → JS | Предупреждение о памяти |
| `orientationchange` | native → JS | Смена ориентации |
| `destroy` | native → JS | Выгрузка WebView |

События обложки (`cover:action`, `cover:active`, `cover:inactive`): см. [cover.md](../api/cover.md).

Подробнее: [event-system.md](../architecture/event-system.md).

## Сигнал готовности приложения

После инициализации UI диспатчьте DOM-событие — runtime скроет splash:

```typescript
document.dispatchEvent(new CustomEvent("aurobore:ready"));
```

## Стримы плагинов

Методы с `stream: true` в манифесте возвращают подписку:

```typescript
import { Echo } from "@aurobore/echo";
import type { StreamSubscription } from "@aurobore/core";

const sub = (await Echo.watchTicks({})) as StreamSubscription;

sub.onData = (payload) => {
  console.log("tick", payload);
};
sub.onError = (err) => {
  console.error(err.message);
};
sub.onComplete = () => {
  console.log("done");
};

// досрочная остановка
sub.stop();
```

## Пользовательские события (JS → native)

```typescript
import { emit } from "@aurobore/core";

emit("app:custom", { action: "refresh" });
```

## Пример

Полный демо-код: [`examples/hello-world/src/ts/app.ts`](https://github.com/aurobore-platform/aurora/blob/main/examples/hello-world/src/ts/app.ts).
