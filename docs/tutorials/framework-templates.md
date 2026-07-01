# Шаблоны React / Vue / Svelte

Официальные точки входа для популярных фреймворков (FR-S4). Каждый шаблон — готовый Vite-проект с `aurobore.config.json`, демо Echo/Device и адаптером `@aurobore/*`.

> Примеры в репозитории: [`react-demo`](../../examples/react-demo/), [`vue-demo`](../../examples/vue-demo/), [`svelte-demo`](../../examples/svelte-demo/).

## `create` или `init`?

| Сценарий | Команда |
|----------|---------|
| Новый проект с нуля | `aurobore create MyApp --template react\|vue\|svelte` |
| Уже есть Vue/React/Svelte + Vite | [`aurobore init`](demo-existing-app.md) |

`create` копирует шаблон из `templates/`; `init` только добавляет конфиг Aurobore в существующий репозиторий.

## Быстрый путь (React)

```bash
aurobore create MyApp --template react
cd MyApp
pnpm install
pnpm build          # vite build → dist/
aurobore build      # web → RPM
aurobore run        # эмулятор
```

Аналогично для `--template vue` и `--template svelte`.

Скрипты в шаблоне:

```bash
pnpm aurora:dev     # HMR + dev-контейнер
pnpm build:aurora   # pnpm build && aurobore build
pnpm aurora:run
```

## Что внутри шаблона

- **Vite** с `base: '/'` — обязательно для WebView (не `/repo-name/`).
- **`aurobore.config.json`**: `web.root: "dist"`, плагины `@aurobore/echo`, `@aurobore/device`.
- **Адаптеры** поверх `@aurobore/core`:
  - React: `useLifecycle()`, `useAuroboreEvent()`
  - Vue: те же имена как composables
  - Svelte: `lifecycle` store, `auroboreEventStore()`, `useAuroboreEvent()`
- **Zero-config chrome** — safe-area из runtime; в шаблоне нет ручного `env(safe-area-inset-*)`.

## Адаптеры и плагины

Вызов плагинов — typed imports (как в vanilla):

```ts
import { Echo } from "@aurobore/echo";
import { Device } from "@aurobore/device";

const ping = await Echo.ping({});
```

Lifecycle в React:

```tsx
import { useLifecycle } from "@aurobore/react";

const { event } = useLifecycle();
// event: "ready" | "pause" | "resume" | null
```

Vue:

```vue
<script setup lang="ts">
import { useLifecycle } from "@aurobore/vue";
const { event: lifecycleEvent } = useLifecycle();
</script>
```

Svelte:

```svelte
<script lang="ts">
  import { lifecycle } from "@aurobore/svelte";
  // $lifecycle или lifecycle.subscribe(...)
</script>
```

Подробнее о событиях: [events-and-lifecycle.md](events-and-lifecycle.md).

## Dev с HMR

```bash
pnpm aurora:dev
```

`aurobore dev` определяет Vite-проект и поднимает dev-сервер с HMR для WebView на эмуляторе (см. [architecture/dev-server.md](../architecture/dev-server.md)).

## Добавление плагинов

```bash
aurobore plugin add storage
```

Импорт в коде:

```ts
import { Storage } from "@aurobore/storage";
```

См. [using-plugins.md](using-plugins.md).

## См. также

- [quick-start.md](quick-start.md) — vanilla и общий workflow
- [demo-existing-app.md](demo-existing-app.md) — подключение существующего Vite-сайта
- [typescript-sdk.md](../architecture/typescript-sdk.md) §6 — адаптеры фреймворков
