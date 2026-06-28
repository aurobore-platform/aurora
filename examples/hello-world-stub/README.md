# hello-world-stub

Минимальная фикстура для e2e `aurobore build` / `aurobore run` (M4).

```powershell
cd examples/hello-world-stub
pnpm --filter @aurobore/cli exec aurobore config validate
pnpm --filter @aurobore/cli exec aurobore plugin list
pnpm --filter @aurobore/cli exec aurobore build
pnpm --filter @aurobore/cli exec aurobore run
```

## Управление плагинами

Built-in MVP-плагины (device, storage, network, …) добавляются **без npm**:

```powershell
aurobore plugin add network      # built-in
aurobore plugin remove echo
aurobore plugin list             # версии + compat status
aurobore build                   # пересборка RPM после изменений
```

Внешний npm-пакет: `aurobore plugin add @scope/pkg --external`.

Статический `dist/index.html` уже включён; пересборка веба не требуется.
