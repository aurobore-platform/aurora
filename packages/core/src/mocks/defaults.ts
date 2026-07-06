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

/** Minimal JPEG frame for mock camera stream (1×1). */
export const MOCK_CAMERA_FRAME_BASE64 =
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==";
