// @generated — do not edit

export interface StorageValue { value: string }

export interface StorageKeys { keys: unknown[] }

export interface StorageApi {
  get(args?: { key?: string }): Promise<{ value: string }>;
  set(args?: { key?: string; value?: string }): Promise<void>;
  remove(args?: { key?: string }): Promise<void>;
  keys(args?: {  }): Promise<{ keys: unknown[] }>;
  clear(args?: {  }): Promise<void>;
}
