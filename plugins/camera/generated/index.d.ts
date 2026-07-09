// @generated — do not edit

export interface Photo { kind: string; url: string; mimeType?: string; size?: number; width?: number; height?: number; format?: string }

export interface GetPhotoArgs { quality?: number; allowEditing?: boolean }

export interface PickPhotoArgs { allowEditing?: boolean }

export interface WatchPreviewArgs { facingMode?: string; width?: number; height?: number; maxFps?: number }

export interface CameraApi {
  getPhoto(args?: { quality?: number; allowEditing?: boolean }): Promise<{ kind: string; url: string; mimeType?: string; size?: number; width?: number; height?: number; format?: string }>;
  pickPhoto(args?: { allowEditing?: boolean }): Promise<{ kind: string; url: string; mimeType?: string; size?: number; width?: number; height?: number; format?: string }>;
  watchPreview(args?: { facingMode?: string; width?: number; height?: number; maxFps?: number }): Promise<{ subscriptionId: string; onData: (payload: unknown) => void; onError: (error: unknown) => void; onComplete: () => void; stop: () => void }>;
}
