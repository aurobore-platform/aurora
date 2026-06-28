# Каталог стандартных плагинов

> Зоны ответственности официальных плагинов и приоритет их появления.
> **Справочник API MVP:** [README.md](README.md) (методы, типы, коды ошибок).

Стандартные плагины — официальные, поддерживаемые core-командой. Они задают эталон качества
(манифест, типы, документация, conformance-тесты) для сторонних плагинов.

## 1. Приоритеты по этапам

| Приоритет | Плагины | Этап |
|---|---|---|
| **MVP (MUST)** | Device, Storage, FileSystem, Clipboard, Network | MVP |
| **Расширение (SHOULD)** | Camera, Geolocation, Notifications (local), Share, Sensors | Alpha/Beta |
| **Дополнительно (COULD)** | Contacts, Biometric, Secure Storage, Push, Background Tasks, Haptics, App/Browser | пост-1.0 |

## 2. Плагины MVP

### Device
- **Назначение:** информация об устройстве/приложении.
- **Reference:** [device.md](device.md)

### Storage (key-value)
- **Назначение:** простое постоянное хранилище ключ-значение.
- **Reference:** [storage.md](storage.md)

### FileSystem
- **Назначение:** работа с файлами в области данных приложения (scope `appData`).
- **Reference:** [filesystem.md](filesystem.md)

### Clipboard
- **Назначение:** буфер обмена (текст).
- **Reference:** [clipboard.md](clipboard.md)

### Network
- **Назначение:** состояние сети, событие `network:change`.
- **Разрешения:** `Internet`
- **Reference:** [network.md](network.md)

### Echo (conformance)
- **Назначение:** stub для тестирования моста (invoke, ошибки, стрим).
- **Reference:** [echo.md](echo.md)

## 3. Плагины расширения (SHOULD)

### Camera
- Съёмка фото/видео, выбор из галереи. Возвращает **URL ресурса** через Asset Loader (не байты в JSON).
- Разрешения: `camera` (и хранилище при сохранении).

### Geolocation
- Текущая позиция и **стрим** наблюдения (`watch`), остановка.
- Разрешения: `location`.

### Notifications (local)
- Локальные уведомления: создать/отменить/расписание; события нажатия.
- Разрешения: по модели Аврора.

### Share
- Системный шаринг текста/файлов/URL.

### Sensors
- Акселерометр/гироскоп и пр. как **стримы** с backpressure/прореживанием.

## 4. Дополнительные плагины (COULD)

Contacts, Biometric, Secure Storage, Push Notifications, Background Tasks, Haptics (вибро),
App (события/состояние приложения), Browser (внешний браузер/in-app). Появляются по мере спроса
сообщества; сторонние реализации поощряются.

## 5. Общие требования к стандартному плагину

- Полный **манифест** (методы/события/типы/**errors**/разрешения/совместимость/nativeDeps).
- Сгенерированные JS-обёртка и типы.
- Документация и хотя бы один пример.
- Прохождение **conformance suite** (FR-T1).
- Корректная обработка недоступности на устройстве/версии (`*_UNAVAILABLE`) и отказа разрешений.

## 6. Связи

- [README.md](README.md) — справочник API MVP-плагинов.
- [plugin-api.md](plugin-api.md) — контракт плагина.
- [requirements.md](../requirements.md) — приоритеты FR-P5/P6/P8.
- [roadmap.md](../roadmap.md) — когда какой плагин появляется.
