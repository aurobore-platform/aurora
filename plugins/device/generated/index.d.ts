// @generated — do not edit

export interface DeviceInfo { model: string; platform: string; osVersion: string; locale: string }

export interface DeviceApi {
  getInfo(args?: {  }): Promise<{ model: string; platform: string; osVersion: string; locale: string }>;
}
