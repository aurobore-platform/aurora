# Architecture Decision Records (ADR)

ADR фиксируют **значимые архитектурные решения**: контекст, рассмотренные варианты, выбор и последствия.
Принятый ADR — обязателен к соблюдению; изменение решения оформляется новым ADR (со статусом
«заменяет ADR-XXX»).

## Процесс
1. Идея/спорный выбор → черновик [RFC](../rfc/README.md) (опционально, для обсуждения).
2. Решение → ADR по шаблону [ADR-000-template.md](ADR-000-template.md).
3. Статусы: `Proposed` → `Accepted` → (`Deprecated` / `Superseded by ADR-YYY`).

## Реестр

| ADR | Заголовок | Статус |
|---|---|---|
| [ADR-001](ADR-001-runtime-architecture.md) | Архитектура Runtime: нативный контейнер C++/QML | Accepted |
| [ADR-002](ADR-002-bridge-model.md) | Модель Bridge: асинхронный обмен сообщениями (Promise/события/стримы) | Accepted |
| [ADR-003](ADR-003-plugin-api.md) | Plugin API: манифест как SoT + статическая регистрация + кодоген | Accepted |
| [ADR-004](ADR-004-webview-engine-abstraction.md) | Целевой движок Chromium/CEF (без Gecko); тонкий шов транспорта | Accepted |
| [ADR-005](ADR-005-cli-stack.md) | Стек CLI/инструментов: Node.js + TypeScript | Accepted |
| [ADR-006](ADR-006-configuration-format.md) | Формат конфигурации и манифеста | Accepted |
| [ADR-007](ADR-007-packaging-build.md) | Упаковка и сборка: CMake + RPM через Aurora SDK | Accepted |
| [ADR-008](ADR-008-typescript-sdk-codegen.md) | Кодогенерация TypeScript SDK из манифестов | Accepted |
| [ADR-009](ADR-009-naming.md) | Кодовое имя проекта Aurobore и неймспейсы | Accepted |
