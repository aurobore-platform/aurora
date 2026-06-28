# Echo

Conformance-stub для проверки моста: invoke, reject, стрим.

**Пакет:** `@aurobore/echo`  
**Разрешения:** нет

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `ping` | `{}` | `{ pong: boolean; ts: number }` | Проверка round-trip |
| `echo` | `object` | `object` | Возвращает переданные args |
| `fail` | `{}` | — | Всегда reject (тест ошибок) |
| `watchTicks` | `{}` | stream | 5 тиков, затем complete |

## Типы

### `PingResult`

| Поле | Тип |
|------|-----|
| `pong` | `boolean` |
| `ts` | `number` |

## Коды ошибок

| Код | Сообщение | Когда |
|-----|-----------|-------|
| `ECHO_TEST_ERROR` | demo error | Метод `fail()` — намеренная ошибка для тестов; `data.code === 42` |

## Пример

```typescript
import { Echo } from "@aurobore/echo";
import { wrapBridgeError, isAuroboreError } from "@aurobore/core";

const ping = await Echo.ping({});
console.log(ping.pong); // true

try {
  await Echo.fail({});
} catch (err) {
  const e = isAuroboreError(err) ? err : wrapBridgeError(err as { code: string; message: string });
  console.log(e.code); // ECHO_TEST_ERROR
}

const sub = await Echo.watchTicks({});
sub.onData = (p) => console.log((p as { tick: number }).tick);
sub.onComplete = () => console.log("done");
```

См. также [examples/hello-world/](../../examples/hello-world/).
