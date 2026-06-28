# Device

Информация об устройстве и локали.

**Пакет:** `@aurobore/device`  
**Разрешения:** нет

## Методы

| Метод | Аргументы | Результат | Описание |
|-------|-----------|-----------|----------|
| `getInfo` | `{}` | `DeviceInfo` | Модель, платформа, версия ОС, локаль |

## Типы

### `DeviceInfo`

| Поле | Тип | Описание |
|------|-----|----------|
| `model` | `string` | Имя продукта (QSysInfo) |
| `platform` | `string` | Тип платформы |
| `osVersion` | `string` | Версия ОС |
| `locale` | `string` | Локаль системы |

## Коды ошибок

Plugin-specific кодов нет. Возможны только ошибки моста (`BRIDGE_*`), например `BRIDGE_METHOD_NOT_FOUND` при вызове несуществующего метода.

## Пример

```typescript
import { Device } from "@aurobore/device";

const info = await Device.getInfo({});
console.log(`${info.model} / ${info.platform} ${info.osVersion}`);
```
