# templates/ — шаблоны для `aurobore create`

Рабочие каркасы проектов.

```bash
aurobore create MyApp --template vanilla   # TypeScript + SDK (рекомендуется)
aurobore create MyApp --template minimal   # plain JS + globals
```

| Шаблон | Назначение |
|---|---|
| `vanilla` | TypeScript, `@aurobore/core`, typed plugin imports |
| `minimal` | Минимальный plain JS без сборщика |
