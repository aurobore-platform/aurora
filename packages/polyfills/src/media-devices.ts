import { getAurobore } from "@aurobore/core";
import type { StreamSubscription } from "@aurobore/core";
import { catchAurobore, domException } from "./errors.js";
import { createVideoStreamFromSubscription } from "./media-stream.js";

export interface MediaStreamConstraints {
  video?: boolean | MediaTrackConstraints;
  audio?: boolean | MediaTrackConstraints;
}

function parseVideoConstraints(
  video: boolean | MediaTrackConstraints | undefined,
): Record<string, unknown> {
  if (!video || video === true) return {};
  const out: Record<string, unknown> = {};
  const c = video;
  if (c.facingMode !== undefined) {
    out.facingMode =
      typeof c.facingMode === "string"
        ? c.facingMode
        : (c.facingMode as { ideal?: string }).ideal;
  }
  if (c.width !== undefined) {
    out.width = typeof c.width === "number" ? c.width : (c.width as { ideal?: number }).ideal;
  }
  if (c.height !== undefined) {
    out.height = typeof c.height === "number" ? c.height : (c.height as { ideal?: number }).ideal;
  }
  return out;
}

async function getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
  if (constraints.audio) {
    throw domException("NotFoundError", "Audio capture is not supported in Aurobore polyfills v1");
  }
  if (!constraints.video) {
    throw domException("TypeError", "At least one of audio or video must be requested");
  }

  const videoArgs = parseVideoConstraints(constraints.video);
  const maxFps = 15;

  const sub = (await getAurobore().invoke(
    "Camera",
    "watchPreview",
    videoArgs,
    { stream: true, maxFps, streamCoalesce: true },
  )) as StreamSubscription;

  const polyfillStream = createVideoStreamFromSubscription(sub, maxFps);
  return polyfillStream.streamForVideo;
}

export function installMediaDevicesPolyfill(): void {
  const nav = navigator as Navigator & { mediaDevices?: MediaDevices };
  if (!nav.mediaDevices) {
    Object.defineProperty(nav, "mediaDevices", {
      value: {},
      configurable: true,
      writable: true,
    });
  }

  const md = nav.mediaDevices!;
  if (typeof md.getUserMedia === "function") return;

  md.getUserMedia = (constraints: MediaStreamConstraints) =>
    catchAurobore(() => getUserMedia(constraints));

  if (typeof md.enumerateDevices !== "function") {
    md.enumerateDevices = () => Promise.resolve([]);
  }
}
