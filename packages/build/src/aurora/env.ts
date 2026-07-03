import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findMonorepoRoot } from "../codegen/project.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface AuroraEnv {
  SFDK_TARGET: string;
  POC_BUILD_DIR: string;
  EMULATOR_SSH_USER: string;
  EMULATOR_SSH_HOST: string;
  EMULATOR_SSH_PORT: string;
  EMULATOR_SSH_KEY: string;
  EMULATOR_BOOT_TIMEOUT: string;
  EMULATOR_WARMUP_SEC: string;
  EMULATOR_SSH_CONNECT_TIMEOUT: string;
  EMULATOR_SESSION_WAIT_SEC: string;
  POC_RUN_WAIT_SEC: string;
  AURORA_SDK_BIN: string;
  SystemRoot: string;
  /** CEF remote debugging port for monorepo container:run (optional). */
  AUROBORE_CEF_DEBUG_PORT?: string;
}

function expandPath(s: string): string {
  if (process.platform === "win32") {
    return s
      .replace(/^%USERPROFILE%/i, os.homedir())
      .replace(/^~(?=\\|\/|$)/, os.homedir());
  }
  return s.replace(/^~(?=\\|\/|$)/, os.homedir());
}

function loadEnvFile(filePath: string, env: Record<string, string>): void {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    env[key] = expandPath(trimmed.slice(eq + 1).trim());
  }
}

export interface LoadAuroraEnvOptions {
  projectRoot?: string;
  stagingName?: string;
  stagingDir?: string;
}

/** Загружает конфигурацию Aurora SDK / эмулятора. */
export function loadAuroraEnv(options: LoadAuroraEnvOptions = {}): AuroraEnv {
  const env: Record<string, string> = {
    SFDK_TARGET: "AuroraOS-5.2.1.200-x86_64",
    EMULATOR_SSH_USER: "defaultuser",
    EMULATOR_SSH_HOST: "127.0.0.1",
    EMULATOR_SSH_PORT: "2223",
    EMULATOR_BOOT_TIMEOUT: "300",
    EMULATOR_WARMUP_SEC: "15",
    EMULATOR_SSH_CONNECT_TIMEOUT: "5",
    EMULATOR_SESSION_WAIT_SEC: "90",
    POC_RUN_WAIT_SEC: "90",
  };

  const monorepo = findMonorepoRoot();
  const envFiles = [
    path.join(os.homedir(), ".aurobore", "local.env"),
    options.projectRoot ? path.join(options.projectRoot, ".aurobore", "local.env") : "",
    monorepo ? path.join(monorepo, "tools", "aurora", "local.env") : "",
  ].filter(Boolean);

  for (const file of envFiles) {
    loadEnvFile(file, env);
  }

  const stagingName = options.stagingName ?? "app";
  if (options.stagingDir) {
    env.POC_BUILD_DIR = expandPath(options.stagingDir);
  } else if (!env.POC_BUILD_DIR) {
    env.POC_BUILD_DIR = path.join(os.homedir(), "aurobore-spike", stagingName);
  } else {
    env.POC_BUILD_DIR = expandPath(env.POC_BUILD_DIR);
  }

  if (!env.EMULATOR_SSH_KEY && process.platform === "win32") {
    const defaultKey = "C:\\AuroraOS\\vmshare\\ssh\\private_keys\\sdk";
    if (fs.existsSync(defaultKey)) env.EMULATOR_SSH_KEY = defaultKey;
  }
  if (!env.AURORA_SDK_BIN && process.platform === "win32") {
    const sdkBin = "C:\\AuroraOS\\bin";
    if (fs.existsSync(path.join(sdkBin, "sfdk.exe"))) env.AURORA_SDK_BIN = sdkBin;
  }

  env.SystemRoot = process.env.SystemRoot ?? "C:\\Windows";

  return env as unknown as AuroraEnv;
}

export function childEnv(cfg: AuroraEnv): NodeJS.ProcessEnv {
  const sdkBin = cfg.AURORA_SDK_BIN || (process.platform === "win32" ? "C:\\AuroraOS\\bin" : "");
  if (!sdkBin) return { ...process.env };
  return {
    ...process.env,
    PATH: `${sdkBin}${path.delimiter}${process.env.PATH ?? ""}`,
  };
}

export function resolveSfdkPath(cfg: AuroraEnv): string {
  if (cfg.AURORA_SDK_BIN) {
    return path.join(cfg.AURORA_SDK_BIN, process.platform === "win32" ? "sfdk.exe" : "sfdk");
  }
  return process.platform === "win32" ? "sfdk.exe" : "sfdk";
}

export function openSshTool(cfg: AuroraEnv, tool: "ssh" | "scp"): string {
  if (process.platform === "win32") {
    const candidate = path.join(cfg.SystemRoot ?? "C:\\Windows", "System32", "OpenSSH", `${tool}.exe`);
    if (fs.existsSync(candidate)) return candidate;
  }
  return tool;
}
