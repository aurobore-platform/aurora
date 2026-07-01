# Демо: существующий сайт (Vue/Vite) → приложение Аврора

Краткий путь: **ваш Vue-проект → `dist/` → RPM → эмулятор**.  
CLI и пакеты ставятся **из npm** — клонировать монорепо Aurobore не нужно.

> **Время:** ~10–15 минут после настройки Aurora SDK.  
> **Не работает:** обёртка «просто URL сайта в интернете» — нужен локальный `dist/` (собранный Vite).

---

## 0. Что должно быть установлено

| Компонент | Зачем |
|-----------|--------|
| **Node.js 20 LTS** | CLI, сборка web |
| **npm** или **pnpm** | пакеты |
| **Aurora SDK** (mb2), эмулятор, сертификаты RPM | `aurobore build` / `run` |
| **Git Bash** (Windows) | команды `mb2` / `sfdk` |

Проверка SDK и окружения:

```bash
aurobore doctor
```

Если `doctor` ругается на SDK — сначала [sdk-overview.md](../aurora/sdk-overview.md) и `tools/aurora/local.env` (для разработки платформы) или переменные окружения SDK на вашей машине.

---

## 1. Установить CLI из npm

**Глобально** (удобно для демо):

```bash
npm install -g @aurobore/cli@^0.0.3
aurobore --version
aurobore --help
```

**Или** в корне Vue-проекта как dev-зависимость (рекомендуется — `aurobore init` добавляет автоматически):

```bash
npm install -D @aurobore/cli@^0.0.3
npx aurobore --version
npx aurobore --help
```

Runtime (`@aurobore/runtime`) подтягивается транзитивно через `@aurobore/build` — **`AUROBORE_RUNTIME_ROOT` не нужен** для npm-сценария.

Дальше в примерах — глобальный `aurobore`; с `npx` замените на `npx aurobore`.

---

## 2. Подключить проект: `aurobore init`

Перейдите в **корень** вашего Vue/Vite-проекта:

```bash
cd path/to/my-vue-app
aurobore init
```

Интерактивно спросит app id, имя, каталог сборки.  
**Без вопросов** (быстрый вариант):

```bash
aurobore init -y --id ru.example.mysite --name "My Site"
```

Команда создаёт:

- `aurobore.config.json`
- `@aurobore/cli` в `devDependencies` (если ещё нет)
- скрипты в `package.json`: `aurora:build`, `aurora:run`, `aurora:dev`, `build:aurora`
- строку `.aurobore/` в `.gitignore`

После init выполните `npm install`, чтобы установить локальный CLI.

---

## 3. Проверить Vite

В `vite.config.ts`:

```ts
export default defineConfig({
  base: '/',  // не '/repo-name/' — иначе ассеты не найдутся в WebView
  // ...
})
```

Если сайт ходит на API/CDN — в `aurobore.config.json` должно быть `"permissions": ["Internet"]` (`init` добавляет по умолчанию).

---

## 4. Собрать и запустить на эмуляторе

```bash
# 1. Обычная web-сборка
npm run build          # → dist/

# 2. Упаковать dist в RPM для Авроры
npm run build:aurora   # = npm run build && aurobore build

# 3. Установить на эмулятор и открыть приложение
npm run aurora:run
```

Или по шагам:

```bash
npm run build
aurobore build
aurobore run
```

На Windows **`aurobore build`** внутри вызывает `mb2` — запускайте терминал **Git Bash**, если PowerShell не видит SDK.

---

## 5. Итерация (правки UI)

После изменений во Vue:

```bash
npm run build
aurobore build
aurobore run
```

Или одной командой: `npm run build:aurora && npm run aurora:run`.

Режим с dev-сервером (web с хоста, контейнер на эмуляторе):

```bash
aurobore dev
```

---

## Минимальный `aurobore.config.json` (если без init)

```json
{
  "configVersion": 1,
  "app": {
    "id": "ru.example.mysite",
    "name": "My Site",
    "version": "1.0.0"
  },
  "web": {
    "root": "dist",
    "entry": "index.html"
  },
  "permissions": ["Internet"],
  "plugins": []
}
```

---

## Частые проблемы

| Симптом | Решение |
|---------|---------|
| Белый экран, 404 на `/assets/...` | `base: '/'` в Vite |
| `web root not found: dist` | Сначала `npm run build` |
| `aurobore: command not found` | `npm install` после init, или `npm i -g @aurobore/cli@^0.0.3` |
| Ошибки `mb2` / sfdk | Git Bash, Aurora SDK, `aurobore doctor` |
| API не работает | `"Internet"` в `permissions` |

---

## Дальше

- Нативный мост и плагины: [using-plugins.md](using-plugins.md)
- Новый проект с нуля (шаблон): [quick-start.md](quick-start.md)
- Полный API: [api/README.md](../api/README.md)
