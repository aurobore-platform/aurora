import { invoke } from "./aurobore.js";
import type { UpdateEvent } from "./types.js";

export type { UpdateEvent };

export interface UpdateManifestInfo {
  bundleVersion?: string;
}

export interface UpdateStatus {
  activeVersion?: string;
  previousVersion?: string;
  pendingVersion?: string;
  phase?: number;
}

export interface UpdateErrorInfo {
  message?: string;
}

/** Проверить канал OTA на новую версию. */
export function check(): Promise<{ ok: boolean }> {
  return invoke("Updates", "check") as Promise<{ ok: boolean }>;
}

/** Применить загруженное обновление из staging (если есть). */
export function apply(): Promise<{ ok: boolean }> {
  return invoke("Updates", "apply") as Promise<{ ok: boolean }>;
}

/** Откатиться к предыдущему бандлу. */
export function rollback(): Promise<{ ok: boolean }> {
  return invoke("Updates", "rollback") as Promise<{ ok: boolean }>;
}

/** Текущий статус OTA (active/pending версии). */
export function getStatus(): Promise<UpdateStatus> {
  return invoke("Updates", "getStatus") as Promise<UpdateStatus>;
}

export const Updates = {
  check,
  apply,
  rollback,
  getStatus,
};
