# Обложка приложения (cover)

Пошаговое руководство: от формальной обложки по умолчанию до интерактивных кнопок.

## 1. Ничего не делать (рекомендуется для большинства SPA)

После `aurobore create` и сборки на домашнем экране Авроры уже видно имя приложения. Код не нужен.

## 2. Статические кнопки в конфиге

Добавьте в `aurobore.config.json`:

```json
{
  "cover": {
    "actions": [
      { "id": "open", "label": "Открыть", "icon": "icon-m-forward" }
    ]
  }
}
```

Пересоберите приложение (`aurobore build` / `pnpm container:build`).

## 3. Обработка нажатий в JS

```typescript
import { on } from "@aurobore/core";

on("cover:action", ({ id }) => {
  if (id === "open") {
    // вернуть фокус или выполнить действие
  }
});
```

## 4. Динамический статус

```typescript
import { cover, on } from "@aurobore/core";

on("pause", () => {
  void cover.setState({
    secondaryText: "3 непрочитанных",
  });
});

on("resume", () => {
  void cover.reset();
});
```

## 5. Демо в runtime-контейнере

Для ручной проверки на эмуляторе откройте demo SPA с параметром:

```
?coverDemo=1
```

При уходе в фон обложка покажет тестовый статус; кнопка «Demo» на обложке вызовет `cover:action` в journal/статус SPA.

## См. также

- [Cover API](../api/cover.md)
- [События и lifecycle](events-and-lifecycle.md)
