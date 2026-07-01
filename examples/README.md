# examples/ — демо-приложения

| Пример | Назначение |
|---|---|
| `hello-world/` | Полный walkthrough: Echo, lifecycle, Device, SDK-импорты (vanilla) |
| `hello-world-stub/` | M4 фикстура для `aurobore build` / `aurobore run` (минимальный HTML) |
| `react-demo/` | React + Vite + `@aurobore/react` — шаблон `create --template react` |
| `vue-demo/` | Vue 3 + Vite + `@aurobore/vue` |
| `svelte-demo/` | Svelte 5 + Vite + `@aurobore/svelte` |
| `camera-demo/` | Camera plugin (A3): getPhoto/pickPhoto, stub handling |
| `geo-demo/` | Geolocation plugin (A3): getCurrentPosition/watch, stub handling |

Туториал по фреймворкам: [docs/tutorials/framework-templates.md](../docs/tutorials/framework-templates.md).

## Проверка

Из корня монорепо:

```powershell
pnpm demos:verify
```

Web-сборка + `aurobore build` (RPM) для всех примеров; fail-fast при первой ошибке.
