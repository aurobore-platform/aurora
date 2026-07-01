# templates/ — шаблоны для `aurobore create`

Рабочие каркасы проектов.

```bash
aurobore create MyApp --template vanilla   # TypeScript + SDK (рекомендуется для plain web)
aurobore create MyApp --template minimal   # plain JS + globals
aurobore create MyApp --template react     # React + Vite
aurobore create MyApp --template vue       # Vue 3 + Vite
aurobore create MyApp --template svelte    # Svelte 5 + Vite
```

| Шаблон | Назначение |
|---|---|
| `vanilla` | TypeScript, `@aurobore/core`, typed plugin imports |
| `minimal` | Минимальный plain JS без сборщика |
| `react` | React 19 + Vite + `@aurobore/react` |
| `vue` | Vue 3 + Vite + `@aurobore/vue` |
| `svelte` | Svelte 5 + Vite + `@aurobore/svelte` |

Для существующего Vite-проекта используйте `aurobore init` — см. [demo-existing-app.md](../docs/tutorials/demo-existing-app.md).
