# plugins/ — официальные плагины

Каждый плагин = `plugin.manifest` (SoT) + `native/` + `generated/` + `package.json` (`@aurobore/<name>`) + `docs/`.
Реализуются в M3 (см. [docs/plugins/plugin-api.md](../docs/plugins/plugin-api.md)).

Плагины MVP: **device, storage, filesystem, clipboard, network**.
