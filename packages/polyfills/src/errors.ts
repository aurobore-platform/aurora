import { AuroboreError, isAuroboreError } from "@aurobore/core";

export function domException(name: string, message: string): DOMException {
  return new DOMException(message, name);
}

export function mapToDomException(error: unknown): DOMException {
  if (error instanceof DOMException) return error;
  if (isAuroboreError(error)) {
    return mapAuroboreCode(error.code, error.message);
  }
  if (error instanceof Error) {
    return domException("Error", error.message);
  }
  return domException("Error", String(error));
}

export function mapAuroboreCode(code: string, message: string): DOMException {
  switch (code) {
    case "BRIDGE_PERMISSION_DENIED":
    case "GEOLOCATION_CANCELLED":
    case "CAMERA_CANCELLED":
      return domException("NotAllowedError", message);
    case "BRIDGE_TIMEOUT":
      return domException("TimeoutError", message);
    case "BRIDGE_CANCELLED":
      return domException("AbortError", message);
    case "GEOLOCATION_UNAVAILABLE":
    case "CAMERA_UNAVAILABLE":
      return domException("NotFoundError", message);
    case "CAMERA_CAPTURE_FAILED":
      return domException("NotReadableError", message);
    default:
      return domException("Error", message || code);
  }
}

export function toPositionError(error: unknown): GeolocationPositionError {
  if (isAuroboreError(error)) {
    const code = positionErrorCode(error.code);
    const err = {
      code,
      message: error.message,
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    } as GeolocationPositionError;
    return err;
  }
  const err = {
    code: 2,
    message: error instanceof Error ? error.message : String(error),
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError;
  return err;
}

function positionErrorCode(code: string): number {
  if (code === "BRIDGE_PERMISSION_DENIED" || code === "GEOLOCATION_CANCELLED") return 1;
  if (code === "BRIDGE_TIMEOUT") return 3;
  return 2;
}

export function rejectDom<T>(error: unknown): Promise<T> {
  return Promise.reject(mapToDomException(error));
}

export function catchAurobore<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((e) => {
    if (isAuroboreError(e)) throw mapAuroboreCode(e.code, e.message);
    throw e;
  });
}
