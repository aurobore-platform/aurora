// @generated — do not edit

export interface ShareTextArgs { text: string; title?: string }

export interface ShareUrlArgs { url: string; title?: string }

export interface ShareFileArgs { kind: string; url: string; mimeType?: string; title?: string }

export interface ShareApi {
  shareText(args?: { text: string; title?: string }): Promise<void>;
  shareUrl(args?: { url: string; title?: string }): Promise<void>;
  shareFile(args?: { kind: string; url: string; mimeType?: string; title?: string }): Promise<void>;
}
