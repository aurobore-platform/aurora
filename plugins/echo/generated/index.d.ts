// @generated — do not edit

export interface PingResult { pong: boolean; ts: number }

export interface ResourceRef { kind: string; url: string; mimeType?: string; size?: number }

export interface EchoApi {
  ping(args?: {  }): Promise<{ pong: boolean; ts: number }>;
  echo(args?: Record<string, unknown>): Promise<Record<string, unknown>>;
  fail(args?: {  }): Promise<void>;
  watchTicks(args?: {  }): Promise<{ subscriptionId: string; onData: (payload: unknown) => void; onError: (error: unknown) => void; onComplete: () => void; stop: () => void }>;
  watchFastTicks(args?: {  }): Promise<{ subscriptionId: string; onData: (payload: unknown) => void; onError: (error: unknown) => void; onComplete: () => void; stop: () => void }>;
  getSampleResource(args?: {  }): Promise<{ kind: string; url: string; mimeType?: string; size?: number }>;
}
