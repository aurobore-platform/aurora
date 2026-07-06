# Разработка платформы (dev)

Операционные гайды для разработчиков монорепо и агентов — **как** менять код, а не только **что** задумано в ADR.

| Документ | Когда читать |
|---|---|
| [web-mock-mode.md](web-mock-mode.md) | `aurobore dev --web` — UI/логика в desktop-браузере без SDK (FR-C12) |
| [w3c-polyfills.md](w3c-polyfills.md) | `@aurobore/polyfills`, перенос SPA/PWA без правок кода (FR-S6) |
| [ota-updates.md](ota-updates.md) | OTA live-обновления веб-бандла: CLI, конфиг, `examples/ota-demo` (FR-R13/FR-C14) |
| [e2e-testing.md](e2e-testing.md) | Сквозные тесты на эмуляторе: `pnpm e2e:verify` (FR-T2) |
| [native-plugin-guide.md](native-plugin-guide.md) | Цикл разработки плагинов, staging, codegen, сборка, Qt-подводные камни |
| [native-debugging.md](native-debugging.md) | Journal, Valgrind, GDB, отладка плагинов на эмуляторе |
| [adding-a-plugin.md](adding-a-plugin.md) | Пошаговый чеклист добавления нового плагина |
| [web-debugging.md](web-debugging.md) | CEF DevTools (`chrome://inspect`) для web-слоя на эмуляторе/устройстве |
| [webview-improvements-plan.md](webview-improvements-plan.md) | План улучшений runtime WebView (референс webview-flutter) |

Связанные документы:

- Архитектура Plugin API — [plugins/plugin-api.md](../plugins/plugin-api.md)
- Dev-toolkit (sfdk, эмулятор) — [tools/aurora/README.md](../../tools/aurora/README.md)
- Контракт native SDK (код) — [runtime/native-sdk/README.md](../../runtime/native-sdk/README.md)
- План MVP — [mvp-plan.md](../mvp-plan.md)
- План улучшений (очередь фич) — [improvements-plan.md](../improvements-plan.md)
