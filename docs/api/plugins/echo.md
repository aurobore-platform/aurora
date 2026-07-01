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
| `watchFastTicks` | `{}` | stream | — |
| `getSampleResource` | `{}` | `ResourceRef` | — |

## Типы

### `PingResult`

| Поле | Тип |
|------|-----|
| `pong` | `boolean` |
| `ts` | `number` |

### `ResourceRef`

| Поле | Тип |
|------|-----|
| `kind` | `string` |
| `url` | `string` |
| `mimeType` | `string?` |
| `size` | `number?` |


## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `ECHO_TEST_ERROR` | demo error | Метод fail() — conformance-stub для проверки reject в приложении |
| `ECHO_RESOURCE_ERROR` | failed to write sample resource | getSampleResource() — ошибка записи в app-data |
## Импорт

```typescript
import { Echo } from "@aurobore/echo";
```
