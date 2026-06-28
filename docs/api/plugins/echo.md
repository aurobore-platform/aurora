<!-- AUTO-GENERATED from plugins/echo/plugin.manifest — do not edit by hand -->

# Echo

> Сгенерировано из `plugin.manifest`. Ручной справочник: [plugins/echo.md](../../plugins/echo.md).

**Пакет:** `@aurobore/echo`  
**Разрешения:** нет

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `ping` | `{}` | `PingResult` | — |
| `echo` | `object` | `object` | — |
| `fail` | `{}` | — | — |
| `watchTicks` | `{}` | stream | — |

## Типы

### `PingResult`

| Поле | Тип |
|------|-----|
| `pong` | `boolean` |
| `ts` | `number` |


## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `ECHO_TEST_ERROR` | demo error | Метод fail() — conformance-stub для проверки reject в приложении |
## Импорт

```typescript
import { Echo } from "@aurobore/echo";
```
