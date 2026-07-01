import process from "node:process";
import path from "node:path";
import {
  childEnv,
  findConfigFile,
  findMonorepoRoot,
  loadAuroraEnv,
  loadConfig,
  resolveBundledRuntimeRoot,
  resolvePluginManifests,
  checkProjectIcons,
  validateConfig,
  probeDockerDaemon,
  resolveDevHost,
  isPortAvailable,
  probeTcpHost,
} from "@aurobore/build";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import type { CheckStatus, DoctorCheck, DoctorReport } from "./doctor-types.js";

const MIN_NODE_MAJOR = 20;

function probeVersion(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  try {
    const res = spawnSync(command, args, {
      encoding: "utf8",
      shell: process.platform === "win32",
      env,
    });
    if (res.status === 0 && typeof res.stdout === "string") {
      return res.stdout.trim();
    }
    return null;
  } catch {
    return null;
  }
}

function checkNode(): DoctorCheck {
  const major = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
  if (major >= MIN_NODE_MAJOR) {
    return {
      name: "Node.js",
      status: "ok",
      detail: `v${process.versions.node} (>= ${MIN_NODE_MAJOR})`,
    };
  }
  return {
    name: "Node.js",
    status: "fail",
    detail: `v${process.versions.node}; требуется >= ${MIN_NODE_MAJOR}`,
  };
}

function checkPnpm(): DoctorCheck {
  const version = probeVersion("pnpm", ["--version"]);
  if (version) {
    return { name: "pnpm", status: "ok", detail: `v${version}` };
  }
  return {
    name: "pnpm",
    status: "fail",
    detail: "не найден; включите через `corepack enable`",
  };
}

function checkRuntime(): DoctorCheck {
  const bundled = resolveBundledRuntimeRoot();
  if (bundled) {
    return {
      name: "Aurobore runtime",
      status: "ok",
      detail: `@aurobore/runtime (${path.basename(bundled)})`,
    };
  }
  return {
    name: "Aurobore runtime",
    status: "fail",
    detail: "не найден; установите @aurobore/cli (включает @aurobore/runtime)",
  };
}

function checkAuroraSdk(cwd: string): DoctorCheck {
  const auroraEnv = loadAuroraEnv({ projectRoot: cwd });
  const env = childEnv(auroraEnv);

  const sfdk = probeVersion("sfdk", ["--version"], env);
  if (sfdk) {
    return { name: "Aurora SDK (sfdk)", status: "ok", detail: sfdk };
  }
  const mb2 = probeVersion("mb2", ["--version"], env);
  if (mb2) {
    return { name: "Aurora SDK (mb2)", status: "ok", detail: mb2 };
  }
  return {
    name: "Aurora SDK (sfdk/mb2)",
    status: "warn",
    detail: "не найден на PATH; нужен для build/run под Аврору",
  };
}

function checkProjectConfig(cwd: string): DoctorCheck {
  const configPath = findConfigFile(cwd);
  if (!configPath) {
    return {
      name: "aurobore.config",
      status: "warn",
      detail: "не найден в текущем каталоге (нормально вне проекта приложения)",
    };
  }

  try {
    const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const errors = validateConfig(raw);
    if (errors.length > 0) {
      return {
        name: "aurobore.config",
        status: "fail",
        detail: errors.map((e) => `${e.path}: ${e.message}`).join("; "),
      };
    }

    const { config } = loadConfig(cwd);
    const pluginRefs = config.plugins ?? [];
    if (pluginRefs.length === 0) {
      return {
        name: "aurobore.config",
        status: "ok",
        detail: `${config.app.id} — web-only, плагины не указаны`,
      };
    }

    const monorepo = findMonorepoRoot(cwd) ?? undefined;
    resolvePluginManifests(cwd, pluginRefs, monorepo);
    return {
      name: "aurobore.config",
      status: "ok",
      detail: `${config.app.id} — ${pluginRefs.length} plugin(s)`,
    };
  } catch (err) {
    return {
      name: "aurobore.config",
      status: "fail",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

function checkSfdkTarget(cwd: string): DoctorCheck {
  const env = loadAuroraEnv({ projectRoot: cwd });
  if (!env.SFDK_TARGET) {
    return { name: "SFDK target", status: "warn", detail: "SFDK_TARGET не задан" };
  }
  return { name: "SFDK target", status: "ok", detail: env.SFDK_TARGET };
}

function checkProjectIconsDoctor(cwd: string): DoctorCheck {
  const configPath = findConfigFile(cwd);
  if (!configPath) {
    return {
      name: "App icons",
      status: "warn",
      detail: "aurobore.config не найден",
    };
  }
  try {
    const { config } = loadConfig(cwd);
    const result = checkProjectIcons(cwd, config.app.id, config.app.icon);
    return {
      name: "App icons",
      status: result.level === "warn" ? "warn" : "ok",
      detail: result.detail,
    };
  } catch (err) {
    return {
      name: "App icons",
      status: "warn",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

function checkDocker(): DoctorCheck {
  const probe = probeDockerDaemon();
  return {
    name: "Docker (sfdk build engine)",
    status: probe.status === "ok" ? "ok" : probe.status === "warn" ? "warn" : "fail",
    detail: probe.detail,
  };
}

function checkDevHost(): DoctorCheck {
  const host = resolveDevHost();
  if (host === "127.0.0.1") {
    return {
      name: "Dev host (LAN)",
      status: "warn",
      detail:
        "только loopback; эмулятор не достучится до dev server — подключите Wi-Fi/Ethernet или VPN",
    };
  }
  return {
    name: "Dev host (LAN)",
    status: "ok",
    detail: `${host} (эмулятор грузит http://${host}:<port>/)`,
  };
}

async function checkDevPort(cwd: string): Promise<DoctorCheck> {
  const configPath = findConfigFile(cwd);
  let port = 5173;
  if (configPath) {
    try {
      const { config } = loadConfig(cwd);
      port = config.web.devServer?.port ?? 5173;
    } catch {
      /* keep default */
    }
  }
  const free = await isPortAvailable(port);
  if (free) {
    return { name: "Dev server port", status: "ok", detail: `port ${port} свободен` };
  }
  return {
    name: "Dev server port",
    status: "fail",
    detail: `port ${port} занят; укажите --port или освободите порт (Windows: проверьте файрвол)`,
  };
}

async function checkEmulatorSsh(): Promise<DoctorCheck> {
  const reachable = await probeTcpHost("127.0.0.1", 2223);
  if (reachable) {
    return { name: "Emulator SSH", status: "ok", detail: "127.0.0.1:2223 доступен" };
  }
  return {
    name: "Emulator SSH",
    status: "warn",
    detail: "127.0.0.1:2223 недоступен; запустите эмулятор (`sfdk emulator start`) перед run/dev",
  };
}

function checkDevInternetPermission(cwd: string): DoctorCheck {
  const configPath = findConfigFile(cwd);
  if (!configPath) {
    return {
      name: "Dev permissions",
      status: "warn",
      detail: "aurobore.config не найден",
    };
  }
  try {
    const { config } = loadConfig(cwd);
    const perms = config.permissions ?? [];
    if (perms.includes("Internet")) {
      return { name: "Dev permissions", status: "ok", detail: "Internet granted для dev server" };
    }
    return {
      name: "Dev permissions",
      status: "warn",
      detail: 'нет "Internet" в permissions — WebView не загрузит http:// dev server',
    };
  } catch (err) {
    return {
      name: "Dev permissions",
      status: "warn",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Выполняет проверки окружения разработчика Aurobore. */
export async function runDoctor(cwd: string = process.cwd()): Promise<DoctorReport> {
  const checks = [
    checkNode(),
    checkPnpm(),
    checkRuntime(),
    checkAuroraSdk(cwd),
    checkDocker(),
    checkProjectConfig(cwd),
    checkProjectIconsDoctor(cwd),
    checkSfdkTarget(cwd),
    checkDevHost(),
    await checkDevPort(cwd),
    await checkEmulatorSsh(),
    checkDevInternetPermission(cwd),
  ];
  const ok = checks.every((c) => c.status !== "fail");
  return { checks, ok };
}

const STATUS_LABEL: Record<CheckStatus, string> = {
  ok: "[ OK ]",
  warn: "[WARN]",
  fail: "[FAIL]",
};

export function formatReport(report: DoctorReport): string {
  const lines = report.checks.map((c) => `${STATUS_LABEL[c.status]} ${c.name}: ${c.detail}`);
  lines.push("");
  lines.push(
    report.ok ? "Окружение готово к работе." : "Есть критичные проблемы окружения (FAIL).",
  );
  return lines.join("\n");
}
