import { spawnSync } from "node:child_process";

export type DockerProbeStatus = "ok" | "fail" | "warn";

export interface DockerProbeResult {
  status: DockerProbeStatus;
  detail: string;
}

/** Git Bash / MSYS — sfdk на Windows официально не поддерживает. */
export function isMsysShell(): boolean {
  return Boolean(process.env.MSYSTEM);
}

/** Проверяет, что Docker daemon доступен (нужен sfdk build engine). */
export function probeDockerDaemon(): DockerProbeResult {
  if (isMsysShell()) {
    return {
      status: "fail",
      detail:
        "sfdk не работает в Git Bash/MSYS; запустите сборку из PowerShell или Windows Terminal (pwsh)",
    };
  }

  const res = spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], {
    encoding: "utf8",
    timeout: 20_000,
    shell: process.platform === "win32",
  });

  if (res.status === 0) {
    const version = typeof res.stdout === "string" ? res.stdout.trim() : "";
    return {
      status: "ok",
      detail: version ? `Docker ${version}` : "daemon отвечает",
    };
  }

  const combined = [res.stderr, res.stdout]
    .filter((s): s is string => typeof s === "string" && s.trim() !== "")
    .join("\n")
    .trim();

  if (
    combined.includes("dockerDesktopLinuxEngine") ||
    combined.includes("cannot find the file specified") ||
    combined.includes("Is the docker daemon running")
  ) {
    return {
      status: "fail",
      detail:
        "Docker Desktop не запущен; откройте Docker Desktop, дождитесь статуса Running, затем повторите container:build",
    };
  }

  if (combined.includes("executable file not found") || combined.includes("not recognized")) {
    return {
      status: "fail",
      detail: "docker не найден в PATH; установите Docker Desktop (Aurora SDK build engine)",
    };
  }

  const firstLine = combined.split(/\r?\n/).find((l) => l.trim()) ?? `exit ${res.status}`;
  return { status: "fail", detail: firstLine };
}

/** Бросает понятную ошибку, если Docker/shell не готовы к sfdk build. */
export function assertBuildEngineReady(): void {
  const probe = probeDockerDaemon();
  if (probe.status !== "ok") {
    throw new Error(`Build engine: ${probe.detail}`);
  }
}
