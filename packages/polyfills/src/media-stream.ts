import type { StreamSubscription } from "@aurobore/core";
import type { CameraFramePayload } from "./types.js";

export function decodeFramePayload(payload: unknown): CameraFramePayload | null {
  if (typeof payload !== "object" || payload === null) return null;
  const p = payload as Record<string, unknown>;
  if (p.kind !== "frame" || typeof p.binaryPayload !== "string") return null;
  return {
    kind: "frame",
    format: (p.format as CameraFramePayload["format"]) ?? "jpeg",
    width: Number(p.width) || 0,
    height: Number(p.height) || 0,
    timestamp: Number(p.timestamp) || Date.now(),
    binaryPayload: p.binaryPayload,
  };
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export class PolyfillMediaStreamTrack {
  readonly kind = "video" as const;
  readonly id: string;
  readonly label = "Aurobore camera";
  enabled = true;
  muted = false;
  readyState: MediaStreamTrackState = "live";
  onended: ((this: MediaStreamTrack, ev: Event) => unknown) | null = null;
  onmute: ((this: MediaStreamTrack, ev: Event) => unknown) | null = null;
  onunmute: ((this: MediaStreamTrack, ev: Event) => unknown) | null = null;

  private readonly stopFn: () => void;
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(
    id: string,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    stopFn: () => void,
  ) {
    this.id = id;
    this.canvas = canvas;
    this.ctx = ctx;
    this.stopFn = stopFn;
  }

  stop(): void {
    if (this.readyState === "ended") return;
    this.readyState = "ended";
    this.stopFn();
    this.onended?.call(this as unknown as MediaStreamTrack, new Event("ended"));
  }

  getSettings(): MediaTrackSettings {
    return { width: this.canvas.width, height: this.canvas.height };
  }

  getConstraints(): MediaTrackConstraints {
    return {};
  }

  applyConstraints(): Promise<void> {
    return Promise.resolve();
  }

  clone(): MediaStreamTrack {
    return this as unknown as MediaStreamTrack;
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return false;
  }

  drawFrame(frame: CameraFramePayload): void {
    if (this.readyState !== "live") return;
    const bytes = base64ToArrayBuffer(frame.binaryPayload);
    const blob = new Blob([bytes], { type: frame.format === "jpeg" ? "image/jpeg" : "image/png" });
    createImageBitmap(blob).then((bitmap) => {
      if (this.readyState !== "live") return;
      if (this.canvas.width !== frame.width) this.canvas.width = frame.width;
      if (this.canvas.height !== frame.height) this.canvas.height = frame.height;
      this.ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
    });
  }
}

export class PolyfillMediaStream {
  readonly id: string;
  active = true;
  onaddtrack: ((this: MediaStream, ev: MediaStreamTrackEvent) => unknown) | null = null;
  onremovetrack: ((this: MediaStream, ev: MediaStreamTrackEvent) => unknown) | null = null;
  private readonly tracks: PolyfillMediaStreamTrack[];
  private readonly captureStream: MediaStream;

  constructor(tracks: PolyfillMediaStreamTrack[], fps: number) {
    this.id = `aurobore-ms-${Date.now()}`;
    this.tracks = tracks;
    const canvas = tracks[0]!.canvas;
    this.captureStream = canvas.captureStream(fps);
  }

  getTracks(): MediaStreamTrack[] {
    return this.captureStream.getTracks();
  }

  getVideoTracks(): MediaStreamTrack[] {
    return this.captureStream.getVideoTracks();
  }

  getAudioTracks(): MediaStreamTrack[] {
    return [];
  }

  getTrackById(id: string): MediaStreamTrack | null {
    return this.captureStream.getTrackById(id);
  }

  addTrack(): void {}
  removeTrack(): void {}
  clone(): MediaStream {
    return this.captureStream.clone();
  }

  addEventListener(): void {}
  removeEventListener(): void {}
  dispatchEvent(): boolean {
    return false;
  }

  get internalTracks(): PolyfillMediaStreamTrack[] {
    return this.tracks;
  }

  get streamForVideo(): MediaStream {
    return this.captureStream;
  }
}

export function createVideoStreamFromSubscription(
  subscription: StreamSubscription,
  maxFps: number,
): PolyfillMediaStream {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D not available");

  const track = new PolyfillMediaStreamTrack(
    `aurobore-track-${subscription.subscriptionId}`,
    canvas,
    ctx,
    () => subscription.stop(),
  );

  subscription.onData = (payload) => {
    const frame = decodeFramePayload(payload);
    if (frame) track.drawFrame(frame);
  };

  subscription.onError = () => track.stop();
  subscription.onComplete = () => track.stop();

  return new PolyfillMediaStream([track], maxFps);
}
