// @generated — do not edit

export interface SensorReading { x: number; y: number; z: number; timestamp: number }

export interface SensorsApi {
  watchAccelerometer(args?: {  }): Promise<{ subscriptionId: string; onData: (payload: unknown) => void; onError: (error: unknown) => void; onComplete: () => void; stop: () => void }>;
  watchGyroscope(args?: {  }): Promise<{ subscriptionId: string; onData: (payload: unknown) => void; onError: (error: unknown) => void; onComplete: () => void; stop: () => void }>;
}
