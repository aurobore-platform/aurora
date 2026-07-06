# E2E device tests (FR-T2)

Сквозные сценарии на эмуляторе Aurora: сборка приложения → deploy → assert поведения моста/UI.

## Сценарий: hello-world-stub

| Шаг | Действие |
|---|---|
| 1 | `aurobore build` в `examples/hello-world-stub` |
| 2 | `aurobore run` с `AUROBORE_E2E=1` |
| 3 | Native `runJavaScript` проверяет `#out` === «Echo ping OK» |
| 4 | Journal-маркер: `[e2e] bridge assert OK` |

Оркестратор: `tools/aurora/verify-e2e.mjs` → `pnpm e2e:verify`.

## Требования

- Aurora SDK (mb2), эмулятор с SSH на `:2223`
- `tools/aurora/local.env` (копия из `local.env.example`)
- Собранные `@aurobore/cli` и `@aurobore/build` (скрипт соберёт при необходимости)

## Ручной прогон

```powershell
cd examples/hello-world-stub
aurobore build
$env:AUROBORE_E2E = "1"
aurobore run
```

См. также [tools/aurora/README.md](../../tools/aurora/README.md).
