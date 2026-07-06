# E2E device tests (FR-T2)

Сквозные сценарии на эмуляторе Aurora: сборка приложения → deploy → assert поведения моста/UI.

Оркестратор: `pnpm e2e:verify` → [`tools/aurora/verify-e2e.mjs`](../../tools/aurora/verify-e2e.mjs).

## Сценарий: hello-world-stub

| Шаг | Действие |
|---|---|
| 1 | `aurobore build` в `examples/hello-world-stub` |
| 2 | `aurobore run` с `AUROBORE_E2E=1` |
| 3 | Native `runJavaScript` проверяет `#out` === «Echo ping OK» |
| 4 | Journal-маркер: `[e2e] bridge assert OK` |

Реализация assert: env-gated код в [`WebAppPage.qml`](../../runtime/container/qml/pages/WebAppPage.qml).

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

## Связанные документы

- Исходный README сценария: [`tests/e2e/README.md`](../../tests/e2e/README.md)
- Dev-toolkit: [tools/aurora/README.md](../../tools/aurora/README.md)
- Требование: [requirements.md](../requirements.md) (FR-T2)
- План: [improvements-plan.md](../improvements-plan.md) (IV.3)
