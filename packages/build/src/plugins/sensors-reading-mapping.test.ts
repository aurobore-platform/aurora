import { describe, expect, it } from "vitest";
import {
  readingFromMappingInput,
  type SensorReadingMappingInput,
} from "./sensors-reading-mapping.js";

describe("sensors SensorReading mapping contract", () => {
  it("maps x/y/z/timestamp", () => {
    const input: SensorReadingMappingInput = {
      x: 0.12,
      y: -9.81,
      z: 0.05,
      timestampMs: 1_700_000_000_000,
    };
    expect(readingFromMappingInput(input)).toEqual({
      x: 0.12,
      y: -9.81,
      z: 0.05,
      timestamp: 1_700_000_000_000,
    });
  });

  it("preserves gyroscope rad/s values", () => {
    const input: SensorReadingMappingInput = {
      x: 0.001,
      y: -0.002,
      z: 0.003,
      timestampMs: 1_700_000_000_001,
    };
    expect(readingFromMappingInput(input)).toEqual({
      x: 0.001,
      y: -0.002,
      z: 0.003,
      timestamp: 1_700_000_000_001,
    });
  });
});
