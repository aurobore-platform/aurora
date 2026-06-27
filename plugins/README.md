# plugins/ — официальные плагины

Каждый плагин = `plugin.manifest` (SoT) + `native/` + `generated/` + `package.json` (`@aurobore/<name>`) + `docs/`.
См. [docs/plugins/plugin-api.md](../docs/plugins/plugin-api.md).

Плагины MVP (M3): **echo** (conformance), **device**, **storage**, **filesystem**, **clipboard**, **network**.

Кодоген: `pnpm codegen:plugins` из корня репо.
