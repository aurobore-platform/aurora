// @generated — do not edit

export interface Position { latitude: number; longitude: number; accuracy?: number; altitude?: number; altitudeAccuracy?: number; heading?: number; speed?: number; timestamp: number }

export interface GetCurrentPositionArgs { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }

export interface WatchArgs { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }

export interface ClearWatchArgs { watchId: string }

export interface GeolocationApi {
  getCurrentPosition(args?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }): Promise<{ latitude: number; longitude: number; accuracy?: number; altitude?: number; altitudeAccuracy?: number; heading?: number; speed?: number; timestamp: number }>;
  watch(args?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number }): Promise<{ subscriptionId: string; onData: (payload: unknown) => void; onError: (error: unknown) => void; onComplete: () => void; stop: () => void }>;
  clearWatch(args?: { watchId: string }): Promise<void>;
}
