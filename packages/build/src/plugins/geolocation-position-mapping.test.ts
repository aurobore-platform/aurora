import { describe, expect, it } from "vitest";
import {
  positionFromMappingInput,
  type PositionMappingInput,
} from "./geolocation-position-mapping.js";

describe("geolocation Position mapping contract", () => {
  it("maps required lat/lon/timestamp", () => {
    const input: PositionMappingInput = {
      latitude: 55.751244,
      longitude: 37.618423,
      timestampMs: 1_700_000_000_000,
    };
    expect(positionFromMappingInput(input)).toEqual({
      latitude: 55.751244,
      longitude: 37.618423,
      timestamp: 1_700_000_000_000,
    });
  });

  it("includes optional fields only when present", () => {
    const input: PositionMappingInput = {
      latitude: 59.93,
      longitude: 30.31,
      timestampMs: 1_700_000_000_001,
      accuracy: 12.5,
      altitude: 15,
      altitudeAccuracy: 3,
      heading: 90,
      speed: 1.2,
    };
    expect(positionFromMappingInput(input)).toEqual({
      latitude: 59.93,
      longitude: 30.31,
      timestamp: 1_700_000_000_001,
      accuracy: 12.5,
      altitude: 15,
      altitudeAccuracy: 3,
      heading: 90,
      speed: 1.2,
    });
  });
});
