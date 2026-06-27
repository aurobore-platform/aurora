// @generated — do not edit

export interface ClipboardText { text: string }

export interface ClipboardApi {
  copy(args?: { text?: string }): Promise<void>;
  paste(args?: {  }): Promise<{ text: string }>;
}
