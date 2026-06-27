# bridge-native (M2)

Native-сторона моста: валидация протокола, маршрутизация invoke/event, stub-плагин **Echo**.

## BridgeRouter

| API | Назначение |
|-----|------------|
| `handleMessage(QVariant)` | JS→native: parse, validate, dispatch |
| `emitEvent(name, data)` | native→JS lifecycle / demo events |
| `emitStream(id, phase, payload?, error?)` | native→JS stream chunks |
| `outbound` signal | QML → `runJavaScript(__auroboreBridgeReceive(...))` |

## Echo stub (до M3 Plugin Manager)

| Метод | Поведение |
|-------|-----------|
| `ping` | `{ pong: true, ts }` |
| `echo` | возвращает args |
| `fail` | `ECHO_TEST_ERROR` |
| `watchTicks` | stream: 5× `{ tick: 1..5 }` @ 200ms, затем `complete` |

Events: `app:demo` → native отвечает `app:echo` с тем же data.

Канал WebView: `aurobore:bridge` (см. `@aurobore/core` `BRIDGE_CHANNEL`).
