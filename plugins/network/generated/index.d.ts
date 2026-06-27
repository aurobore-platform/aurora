// @generated — do not edit

export interface NetworkStatus { online: boolean; connectionType: string }

export interface NetworkApi {
  getStatus(args?: {  }): Promise<{ online: boolean; connectionType: string }>;
}
