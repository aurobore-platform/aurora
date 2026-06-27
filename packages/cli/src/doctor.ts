import { spawnSync } from "node:child_process";
import process from "node:process";

export type CheckStatus = "ok" | "warn" | "fail";

export interface DoctorCheck {
  name: string;
  status: CheckStatus;
  detail: string;
}

export interface DoctorReport {
  checks: DoctorCheck[];
  ok: boolean;
}

const MIN_NODE_MAJOR = 20;

function probeVersion(command: string, args: string[]): string | null {
  try {
    const res = spawnSync(command, args, {
      encoding: "utf8",
      shell: process.platform === "win32",
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
    detail: `v${process.versions.node}; требуется >= ${MIN_NODE_MAJOR} (см. README §требования)`,
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
    detail: "не найден; включите через `corepack enable` (см. README §требования)",
  };
}

function checkAuroraSdk(): DoctorCheck {
  const sfdk = probeVersion("sfdk", ["--version"]);
  if (sfdk) {
    return { name: "Aurora SDK (sfdk)", status: "ok", detail: sfdk };
  }
  const mb2 = probeVersion("mb2", ["--version"]);
  if (mb2) {
    return { name: "Aurora SDK (mb2)", status: "ok", detail: mb2 };
  }
  return {
    name: "Aurora SDK (sfdk/mb2)",
    status: "warn",
    detail:
      "не найден на PATH; нужен для сборки/запуска под Аврору (см. docs/adr/ADR-007-packaging-build.md). " +
      "На Windows запускайте из Git Bash.",
  };
}

/** Выполняет проверки окружения разработчика Aurobore (FR-C: команда `doctor`). */
export function runDoctor(): DoctorReport {
  const checks = [checkNode(), checkPnpm(), checkAuroraSdk()];
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
