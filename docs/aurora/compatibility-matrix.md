# Матрица совместимости Aurobore

> FR-R7, NFR-3. Целевой движок — **Chromium/CEF** (`ru.auroraos.webview`). Gecko вне области поддержки
> ([ADR-004](../adr/ADR-004-webview-engine-abstraction.md)).

## Объявленная поддержка

| Параметр | Значение |
|---|---|
| **Мин. ОС** | `5.1.5` — поле `build.minOs` в `aurobore.config.json` (default в CLI) |
| **CEF/Chromium** | Webview (Chromium) ≥ 5.1.3 ([verification-status.md](verification-status.md) C-2) |
| **Движок** | `chromium` (единственный поддерживаемый) |
| **Gecko** | Не поддерживается |
| **Архитектуры** | `x86_64`, `armv7hl`, `aarch64` (по SDK Аврора) |

## Версии SDK

| SDK target | Статус | Примечание |
|---|---|---|
| `AuroraOS-5.2.1.200-x86_64` | **Verified** | Эмулятор; полный прогон A6 (см. таблицу ниже) |
| `AuroraOS-5.1.6-x86_64` | **Declared, pending verify** | Совместимость по документации ОС; прогон при установке SDK |
| `AuroraOS-5.1.5-x86_64` | **Declared, pending verify** | Минимальная заявленная версия (`minOs`) |

## Прогон сценариев

Команды прогона на текущем SDK:

```powershell
pnpm demos:verify          # 7 examples: web + RPM (~30–60 мин)
pnpm compat:verify         # container:all на эмуляторе (без повторного demos)
```

Полный прогон одной командой: `pnpm compat:verify -- --with-demos`.

Опционально с деплоем demo на эмулятор:

```powershell
pnpm compat:verify -- --run-demo hello-world
```

| Сценарий | 5.2.1.200 | 5.1.x |
|---|---|---|
| `pnpm container:all` (M1/M2/M3 journal) | OK (2026-07-01, re-verify): M1/M2/M3 OK | pending |
| `pnpm demos:verify` (7 examples, RPM) | OK (2026-07-01, re-verify): 7/7 | pending |
| `aurobore run` — `hello-world` | manual (кнопка Benchmark → journal) | pending |
| `aurobore run` — `camera-demo` | manual (stub `CAMERA_UNAVAILABLE`) | pending |
| `aurobore run` — `geo-demo` | manual (stub `GEOLOCATION_UNAVAILABLE`) | pending |
| Bridge benchmark (V-7, hello-world) | manual: кнопка Benchmark в UI | pending |

### Journal-маркеры контейнера (5.2.1.200)

| Маркер | Ожидание | 5.2.1.200 |
|---|---|---|
| `M1 OK` | Asset loader, lifecycle, SPA back | OK |
| `M2 OK` | Bridge invoke, events, stream | OK (в составе container journal) |
| `M3 OK` | Plugins registered, Device + Storage | OK |

## Bridge benchmark (V-7)

Неформальный бенчмарк в [`examples/hello-world/`](../../examples/hello-world/): кнопка **Benchmark**
→ 100× `Echo.ping` + короткий `Echo.watchTicks`. Результаты в UI и journal (`[hello-world] bench:`).

| Метрика | 5.2.1.200 эмулятор | Физ. устройство |
|---|---|---|
| ping median (ms) | _заполняется после прогона_ | рекомендуется |
| ping p95 (ms) | _заполняется после прогона_ | рекомендуется |
| stream ticks (5 ticks) | _заполняется после прогона_ | рекомендуется |

**Вывод Alpha:** JSON-протокол моста достаточен для типичных сценариев; бинарный протокол (FR-B9) — post-1.0.

## Демо-приложения на плагинах A3

| Demo | Плагины | Stub-поведение на эмуляторе |
|---|---|---|
| [`camera-demo`](../../examples/camera-demo/) | Camera, Echo | `CAMERA_UNAVAILABLE` — ожидаемо (A3 scaffold) |
| [`geo-demo`](../../examples/geo-demo/) | Geolocation, Echo | `GEOLOCATION_UNAVAILABLE` — ожидаемо (A3 scaffold) |

Путь create→build→run:

```powershell
cd examples/camera-demo
pnpm build:web
aurobore build
aurobore run
```

## Процедура для 5.1.x SDK

При появлении таргета 5.1.x:

1. Установить SDK target в `tools/aurora/local.env` (`SFDK_TARGET=AuroraOS-5.1.6-x86_64`).
2. `pnpm compat:verify` из корня репо.
3. Обновить таблицу «Прогон сценариев» в этом документе.
4. При успехе — сменить статус 5.1.x на **Verified**.
