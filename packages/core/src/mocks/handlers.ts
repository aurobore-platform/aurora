import { APP_DATA_URL_PREFIX, createResourceRef } from "../resource.js";
import {
  MOCK_CLIPBOARD_TEXT,
  MOCK_DEVICE_INFO,
  MOCK_GEO_POSITION,
  MOCK_NETWORK_STATUS,
  MOCK_NOTIFICATION_ID,
  MOCK_PHOTO_FIXTURE,
  MOCK_SENSOR_READING,
} from "./defaults.js";
import { MockFilesystemState } from "./filesystem.js";
import { MockStorageState } from "./storage.js";
import type { MockDispatchResult } from "./types.js";

export interface MockPluginState {
  storage: MockStorageState;
  filesystem: MockFilesystemState;
  clipboardText: string;
}

export function createMockPluginState(): MockPluginState {
  return {
    storage: new MockStorageState(),
    filesystem: new MockFilesystemState(),
    clipboardText: MOCK_CLIPBOARD_TEXT,
  };
}

function ok(result: unknown): MockDispatchResult {
  return { type: "ok", result };
}

function err(code: string, message: string, data?: unknown): MockDispatchResult {
  return { type: "error", error: { code, message, ...(data === undefined ? {} : { data }) } };
}

function notFound(method: string): MockDispatchResult {
  return {
    type: "error",
    error: {
      code: "BRIDGE_METHOD_NOT_FOUND",
      message: `Unknown method ${method}`,
    },
  };
}

function fsError(code: string, message: string): MockDispatchResult {
  return err(code, message);
}

/** Диспетчер mock-вызовов плагинов (native-сторона в browser mock mode). */
export function dispatchMockInvoke(
  plugin: string,
  method: string,
  args: unknown,
  state: MockPluginState,
): MockDispatchResult {
  const a = (args ?? {}) as Record<string, unknown>;

  if (plugin === "Echo") {
    if (method === "ping") return ok({ pong: true });
    if (method === "echo") return ok(args);
    if (method === "fail") {
      return err("ECHO_TEST_ERROR", "demo error", { code: 42 });
    }
    if (method === "watchTicks") {
      return {
        type: "stream",
        stream: {
          count: 5,
          intervalMs: 10,
          payload: (tick) => ({ tick }),
        },
      };
    }
    if (method === "watchFastTicks") {
      return {
        type: "stream",
        stream: {
          count: 100,
          intervalMs: 0,
          payload: (tick) => ({ tick }),
        },
      };
    }
    if (method === "getSampleResource") {
      return ok({
        kind: "resource",
        url: `${APP_DATA_URL_PREFIX}echo/sample.txt`,
        mimeType: "text/plain",
        size: 28,
      });
    }
    return notFound(method);
  }

  if (plugin === "Cover") {
    if (method === "setState" || method === "setActions" || method === "reset") {
      return ok({ ok: true });
    }
    return notFound(method);
  }

  if (plugin === "Device") {
    if (method === "getInfo") {
      const locale =
        typeof globalThis.navigator !== "undefined" && globalThis.navigator.language
          ? globalThis.navigator.language
          : MOCK_DEVICE_INFO.locale;
      return ok({ ...MOCK_DEVICE_INFO, locale });
    }
    return notFound(method);
  }

  if (plugin === "Storage") {
    if (method === "get") {
      const key = a.key as string | undefined;
      if (!key) return err("STORAGE_INVALID_ARGS", "key required");
      const value = state.storage.get(key);
      return ok({ value: value ?? "" });
    }
    if (method === "set") {
      const key = a.key as string | undefined;
      if (!key) return err("STORAGE_INVALID_ARGS", "key required");
      state.storage.set(key, String(a.value ?? ""));
      return ok(undefined);
    }
    if (method === "remove") {
      const key = a.key as string | undefined;
      if (!key) return err("STORAGE_INVALID_ARGS", "key required");
      state.storage.remove(key);
      return ok(undefined);
    }
    if (method === "keys") return ok({ keys: state.storage.keys() });
    if (method === "clear") {
      state.storage.clear();
      return ok(undefined);
    }
    return notFound(method);
  }

  if (plugin === "FileSystem") {
    const path = a.path as string | undefined;
    try {
      if (method === "readText") {
        if (!path) return fsError("FILESYSTEM_INVALID_PATH", "Invalid or blocked path");
        return ok({ text: state.filesystem.readText(path) });
      }
      if (method === "writeText") {
        if (!path) return fsError("FILESYSTEM_INVALID_PATH", "Invalid or blocked path");
        state.filesystem.writeText(path, String(a.text ?? ""));
        return ok(undefined);
      }
      if (method === "exists") {
        if (!path) return fsError("FILESYSTEM_INVALID_PATH", "Invalid or blocked path");
        return ok({ exists: state.filesystem.exists(path) });
      }
      if (method === "mkdir") {
        if (!path) return fsError("FILESYSTEM_INVALID_PATH", "Invalid or blocked path");
        state.filesystem.mkdir(path);
        return ok(undefined);
      }
      if (method === "delete") {
        if (!path) return fsError("FILESYSTEM_INVALID_PATH", "Invalid or blocked path");
        state.filesystem.delete(path);
        return ok(undefined);
      }
      if (method === "list") {
        const listPath = path ?? "";
        return ok({ entries: state.filesystem.list(listPath) });
      }
    } catch (e) {
      const code = e instanceof Error ? e.message : "FILESYSTEM_IO_ERROR";
      const messages: Record<string, string> = {
        FILESYSTEM_INVALID_PATH: "Invalid or blocked path",
        FILESYSTEM_NOT_FOUND: "File or directory not found",
        FILESYSTEM_IO_ERROR: "Filesystem I/O error",
      };
      return fsError(code, messages[code] ?? "Filesystem I/O error");
    }
    return notFound(method);
  }

  if (plugin === "Clipboard") {
    if (method === "copy") {
      state.clipboardText = String(a.text ?? "");
      return ok(undefined);
    }
    if (method === "paste") return ok({ text: state.clipboardText });
    return notFound(method);
  }

  if (plugin === "Network") {
    if (method === "getStatus") {
      const nav = globalThis.navigator as { onLine?: boolean } | undefined;
      const online = nav?.onLine ?? MOCK_NETWORK_STATUS.online;
      return ok({ online, connectionType: MOCK_NETWORK_STATUS.connectionType });
    }
    return notFound(method);
  }

  if (plugin === "Camera") {
    if (method === "getPhoto" || method === "pickPhoto") {
      const ref = createResourceRef(MOCK_PHOTO_FIXTURE.path, {
        mimeType: MOCK_PHOTO_FIXTURE.mimeType,
        size: MOCK_PHOTO_FIXTURE.size,
      });
      return ok({
        kind: "string",
        url: ref.url,
        mimeType: MOCK_PHOTO_FIXTURE.mimeType,
        size: MOCK_PHOTO_FIXTURE.size,
        width: MOCK_PHOTO_FIXTURE.width,
        height: MOCK_PHOTO_FIXTURE.height,
        format: MOCK_PHOTO_FIXTURE.format,
      });
    }
    return notFound(method);
  }

  if (plugin === "Geolocation") {
    if (method === "getCurrentPosition") {
      return ok({ ...MOCK_GEO_POSITION, timestamp: Date.now() });
    }
    if (method === "watch") {
      return {
        type: "stream",
        stream: {
          count: 5,
          intervalMs: 500,
          payload: (tick) => ({
            ...MOCK_GEO_POSITION,
            accuracy: MOCK_GEO_POSITION.accuracy + tick,
            timestamp: Date.now(),
          }),
        },
      };
    }
    if (method === "clearWatch") return ok(undefined);
    return notFound(method);
  }

  if (plugin === "Sensors") {
    if (method === "watchAccelerometer" || method === "watchGyroscope") {
      return {
        type: "stream",
        stream: {
          count: 10,
          intervalMs: 100,
          payload: (tick) => ({
            ...MOCK_SENSOR_READING,
            x: MOCK_SENSOR_READING.x + tick * 0.001,
            timestamp: Date.now(),
          }),
        },
      };
    }
    return notFound(method);
  }

  if (plugin === "Notifications") {
    if (method === "schedule" || method === "notify") {
      return ok({ id: MOCK_NOTIFICATION_ID });
    }
    if (method === "cancel" || method === "cancelAll") return ok(undefined);
    return notFound(method);
  }

  if (plugin === "Share") {
    if (method === "shareText" || method === "shareUrl" || method === "shareFile") {
      return ok(undefined);
    }
    return notFound(method);
  }

  return {
    type: "error",
    error: {
      code: "BRIDGE_METHOD_NOT_FOUND",
      message: `Unknown plugin ${plugin}`,
    },
  };
}

/** Обработка событий JS → native в mock mode. */
export function dispatchMockEvent(
  name: string,
  data: unknown,
  sendEvent: (name: string, payload: unknown) => void,
): void {
  if (name === "app:demo") {
    sendEvent("app:echo", data);
  }
}
