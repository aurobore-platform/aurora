export {
  MOCK_CLIPBOARD_TEXT,
  MOCK_DEVICE_INFO,
  MOCK_GEO_POSITION,
  MOCK_NETWORK_STATUS,
  MOCK_NOTIFICATION_ID,
  MOCK_PHOTO_FIXTURE,
  MOCK_SAFE_AREA_INSETS,
  MOCK_SENSOR_READING,
} from "./defaults.js";
export { MockFilesystemState } from "./filesystem.js";
export {
  createMockPluginState,
  dispatchMockEvent,
  dispatchMockInvoke,
  type MockPluginState,
} from "./handlers.js";
export { MockStorageState } from "./storage.js";
export type { MockBridgeError, MockDispatchResult, MockStreamSpec } from "./types.js";
