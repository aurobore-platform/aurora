# Changesets

Этот каталог управляется [changesets](https://github.com/changesets/changesets).
Каждое изменение, влияющее на публикуемые пакеты `@aurobore/*`, сопровождается changeset-файлом.

## Релиз на npm

### Подготовка (один раз)

1. **Войти в npm** под аккаунтом, который добавлен в org `@aurobore`:

```bash
npm logout
npm login
npm whoami
```

2. На [npmjs.com → org aurobore → Members](https://www.npmjs.com/settings/aurobore/members) ваш пользователь должен быть **Owner** или **Developer**. Без этого publish в `@aurobore/*` даёт **E404 Not Found** (npm маскирует отсутствие прав).

3. Если org требует 2FA для publish — войдите через `npm login` с одноразовым кодом или используйте [granular access token](https://docs.npmjs.com/creating-and-viewing-access-tokens) с правом publish.

### Выпуск версии

1. Создать changeset: `pnpm changeset`.
2. Применить версии: `pnpm changeset version` (лучше первый релиз **0.1.0**, не `0.0.0`).
3. Собрать и опубликовать:

```bash
pnpm run publish
# или: npm run publish
```

Скрипт `publish` сначала проверяет `npm whoami` и доступ к org (`scripts/check-npm-publish.mjs`), затем `pnpm build` и `pnpm changeset publish`.

Корневой [`.npmrc`](../.npmrc): `@aurobore:registry` и `access=public`.

### Типичные ошибки

| Ошибка | Причина | Решение |
|--------|---------|---------|
| **E401** | Протухший/битый токен в `~/.npmrc` | `npm logout && npm login` |
| **E404** на `@aurobore/...` | Аккаунт не в org или нет прав publish | Добавить в members org `aurobore` |
| Предупреждения `Unknown user config python/msvs_*` | Старые ключи в глобальном `.npmrc` (node-gyp) | Не блокируют publish; можно удалить из `~/.npmrc` |

Пакеты с `"private": true` (examples, templates, plugins) не публикуются.
