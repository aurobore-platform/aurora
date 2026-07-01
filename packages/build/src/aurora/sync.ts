import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import type { AuroraEnv } from "./env.js";
import { childEnv } from "./env.js";

export interface RunCommandOptions {
  cwd?: string;
  inherit?: boolean;
  allowCodes?: number[];
  maxBuffer?: number;
  env?: AuroraEnv;
}

export function pathsEqual(a: string, b: string): boolean {
  try {
    return fs.realpathSync.native(a) === fs.realpathSync.native(b);
  } catch {
    return path.resolve(a) === path.resolve(b);
  }
}

export function runCommand(
  cmd: string,
  args: string[],
  opts: RunCommandOptions = {},
): ReturnType<typeof spawnSync> {
  const inherit = opts.inherit ?? false;
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd,
    env: opts.env ? childEnv(opts.env) : process.env,
    shell: false,
    stdio: inherit ? "inherit" : "pipe",
    maxBuffer: opts.maxBuffer ?? 10 * 1024 * 1024,
    ...(inherit ? {} : { encoding: "utf8" as const }),
  });
  if (!inherit) {
    if (res.stdout) process.stdout.write(res.stdout);
    if (res.stderr) process.stderr.write(res.stderr);
  }
  const ok =
    res.status === 0 || (opts.allowCodes != null && opts.allowCodes.includes(res.status ?? -1));
  if (!ok) {
    throw new Error(`command failed (${res.status}): ${path.basename(cmd)} ${args.join(" ")}`);
  }
  return res;
}

export function syncDir(src: string, dst: string, env?: AuroraEnv): void {
  fs.mkdirSync(dst, { recursive: true });
  if (process.platform === "win32") {
    const robocopy = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "robocopy.exe");
    runCommand(
      robocopy,
      [src, dst, "/E", "/XD", "RPMS", "CMakeFiles", ".sfdk", "/NFL", "/NDL", "/NJH", "/NJS"],
      { allowCodes: [0, 1, 2, 3, 4, 5, 6, 7], env },
    );
  } else {
    runCommand("rsync", ["-a", "--delete", "--exclude", "RPMS/", `${src}/`, `${dst}/`], { env });
  }
}

export interface SyncProjectOptions {
  source: string;
  destination: string;
  extraSync?: Array<{ source: string; destName: string }>;
  env?: AuroraEnv;
}

export function syncProject(options: SyncProjectOptions): void {
  const { source, destination, extraSync = [], env } = options;
  if (pathsEqual(source, destination)) return;

  syncDir(source, destination, env);
  for (const extra of extraSync) {
    syncDir(extra.source, path.join(path.dirname(destination), extra.destName), env);
  }
}
