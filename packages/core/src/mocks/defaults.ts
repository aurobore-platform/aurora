/** Детерминированные значения mock-плагинов для `aurobore dev --web`. */

export const MOCK_GEO_POSITION = {
  latitude: 55.7558,
  longitude: 37.6173,
  accuracy: 12,
  altitude: 156,
  altitudeAccuracy: 5,
  heading: 90,
  speed: 0,
  timestamp: 1_700_000_000_000,
} as const;

export const MOCK_DEVICE_INFO = {
  model: "Aurobore Web Mock",
  platform: "web",
  osVersion: "mock",
  locale: "en-US",
} as const;

export const MOCK_NETWORK_STATUS = {
  online: true,
  connectionType: "wifi",
} as const;

export const MOCK_SENSOR_READING = {
  x: 0.01,
  y: 0.02,
  z: 9.81,
  timestamp: 1_700_000_000_000,
} as const;

export const MOCK_CLIPBOARD_TEXT = "mock clipboard";

export const MOCK_NOTIFICATION_ID = "mock-notif-1";

export const MOCK_SAFE_AREA_INSETS = {
  top: 32,
  right: 0,
  bottom: 0,
  left: 0,
} as const;

export const MOCK_PHOTO_FIXTURE = {
  path: "fixtures/photo.jpg",
  mimeType: "image/jpeg",
  size: 4096,
  width: 64,
  height: 64,
  format: "jpeg",
} as const;
