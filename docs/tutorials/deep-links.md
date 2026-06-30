# Deep links

Руководство по настройке и обработке deep links в приложении Aurobore.

## Конфигурация

В `aurobore.config.json` зарегистрируйте URI-схемы:

```json
{
  "deepLinks": {
    "schemes": ["myapp"]
  }
}
```

При `aurobore build` схемы проецируются в `.desktop`:

- `Exec=<appId> %u` — URI передаётся при cold start
- `MimeType=x-scheme-handler/<scheme>;`
- `Intents=OpenURI`
- `Custom-Schemes=<scheme>` (fallback для OMP Runtime Manager)

## Событие в JavaScript

Runtime доставляет URI как событие **`deeplink`** (алиас **`appurlopen`** для совместимости с Cordova):

```javascript
Aurobore.on("deeplink", ({ url }) => {
  console.log("Opened via:", url);
  // myapp://settings/profile → маршрутизация в вашем роутере
});
```

Payload: `{ url: string }` — полный URI, например `myapp://settings`.

При cold start событие приходит после готовности WebView (`ready`). Если приложение уже запущено — при `resume` с новым URI.

## Маршрутизация в SPA

Deep link не меняет URL в WebView автоматически — это ответственность веб-приложения:

```javascript
function routeFromDeepLink(url) {
  const parsed = new URL(url);
  let path = parsed.pathname || "/";
  if (parsed.hash.length > 1) path = parsed.hash.slice(1);
  router.navigate(path.startsWith("/") ? path : `/${path}`);
}

Aurobore.on("deeplink", ({ url }) => routeFromDeepLink(url));
```

Для hash-router (`#/about`) используйте `parsed.hash`.

## Тест на эмуляторе Aurora

После установки RPM с зарегистрированной схемой:

```bash
gdbus call -e -d ru.omp.RuntimeManager \
  -o /ru/omp/RuntimeManager/Intents1 \
  -m ru.omp.RuntimeManager.Intents1.InvokeIntent \
  OpenURI "{}" "{'uri':<'myapp://settings'>}"
```

Или с хоста (если `xdg-open` доступен в окружении):

```bash
xdg-open myapp://settings
```

Контейнер разработки (`pnpm container:all`) использует схему `aurobore-demo` — проверьте journal и консоль WebView на `A2 deeplink OK`.

## См. также

- [architecture/runtime.md](../architecture/runtime.md) §9
- [architecture/configuration.md](../architecture/configuration.md)
- [requirements.md](../requirements.md) FR-R8
