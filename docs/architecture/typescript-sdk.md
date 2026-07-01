# TypeScript SDK и кодогенерация

> Публичный типизированный API и генерация из манифестов. Архитектура без реализации.
> Решение — [ADR-008](../adr/ADR-008-typescript-sdk-codegen.md).

TypeScript SDK — публичное лицо платформы для веб-разработчика. Цель — «типизация как продукт»:
строгие типы, автодополнение, единая модель ошибок и событий, всё **сгенерировано из манифестов**
(single source of truth), без ручного дублирования (главный анти-паттерн Cordova).

## 1. Состав SDK

| Пакет | Назначение |
|---|---|
| `@aurobore/core` | Базовый API: доступ к `Aurobore`, события (`on/once`), общая модель ошибок, утилиты моста, типы. |
| `@aurobore/<plugin>` | Типизированная обёртка конкретного плагина (`@aurobore/camera`, `@aurobore/geolocation`, …), сгенерированная из манифеста. |
| `@aurobore/cli` | CLI (см. [cli.md](cli.md)). |
| `@aurobore/build` | Логика сборки/кодогенерации (используется CLI). |

## 2. Публичный API (концептуально)

```
import { Aurobore } from "@aurobore/core";
import { Camera } from "@aurobore/camera";

const photo = await Camera.getPhoto({ quality: 80 });   // типизированный результат: Photo
const off = Aurobore.on("pause", () => { /* … */ });
```

- Каждый метод плагина — типизированная async-функция (аргументы и результат описаны типами из манифеста).
- События и стримы — типизированы (имя события → тип данных).
- Доступ как через именованные пакеты (`@aurobore/camera`), так и через глобал `Aurobore.Camera`
  (низкоуровневый слой). Рекомендуется именованный импорт.

## 3. Кодогенерация (manifest → код)

```
plugin.manifest  ──►  генератор  ──►  ├─ JS-обёртка (вызовы invoke/подписки)
                                      ├─ TypeScript .d.ts (типы аргументов/результатов/событий)
                                      ├─ декларация разрешений/нативных зависимостей
                                      └─ заготовка справочной документации
```

- Запускается командой `aurobore generate` и автоматически при `plugin add`/`build`.
- Гарантирует синхронность слоёв: изменил манифест → обновились обёртка, типы, native-регистрация, доки.
- Сгенерированный код помечается «do not edit».

## 4. Модель ошибок в SDK

- Структура ошибки моста (см. [bridge.md](bridge.md#ошибки)) оборачивается в типизированные классы:
  базовый `AuroboreError` + специфичные (`PermissionDeniedError`, `UnavailableError`, `TimeoutError`,
  ошибки конкретных плагинов).
- Коды с пространствами имён (`CAMERA_*`, `BRIDGE_*`, `RUNTIME_*`) → удобная обработка.

## 5. События и стримы в SDK

- `Aurobore.on(name, handler)` / `once` — типизированные системные/плагинные события.
- Стримы плагинов (`Camera`, `Geolocation`) — типизированные подписки с методом остановки.
- Автоматическая очистка подписок (хелперы для фреймворков — SHOULD).

## 6. Интеграции с фреймворками (SHOULD/COULD)

- **Адаптеры** (FR-S5, Alpha): `@aurobore/react`, `@aurobore/vue`, `@aurobore/svelte` — `useLifecycle`, `useAuroboreEvent`, Svelte stores.
- **Шаблоны** (FR-S4): `aurobore create --template react|vue|svelte` — Vite + адаптеры + демо Echo/Device.
- Туториал: [framework-templates.md](../tutorials/framework-templates.md).

## 7. Версионирование

- SDK-пакеты — semver; `@aurobore/core` объявляет совместимость с версией протокола моста/Runtime.
- Несовместимость диагностируется на этапе сборки и в рантайме (см. [plugin-loader.md](plugin-loader.md)).

## 8. Связи

- ↔ [Plugin System](plugin-system.md) — манифесты как источник.
- ↔ [Bridge](bridge.md) — низкоуровневый транспорт под обёртками.
- ↔ [CLI](cli.md) — `generate`, `plugin add`.
- ↔ [Native SDK](native-sdk.md) — парная нативная сторона того же контракта.
