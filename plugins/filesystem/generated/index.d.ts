// @generated — do not edit

export interface FsText { text: string }

export interface FsExists { exists: boolean }

export interface FsList { entries: unknown[] }

export interface FileSystemApi {
  readText(args?: { path?: string }): Promise<{ text: string }>;
  writeText(args?: { path?: string; text?: string }): Promise<void>;
  exists(args?: { path?: string }): Promise<{ exists: boolean }>;
  mkdir(args?: { path?: string }): Promise<void>;
  delete(args?: { path?: string }): Promise<void>;
  list(args?: { path?: string }): Promise<{ entries: unknown[] }>;
}
