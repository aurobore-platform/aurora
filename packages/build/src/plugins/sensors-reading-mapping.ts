/**
 * Контракт маппинга QSensorReading → SensorReading (паритет с SensorsMapping.cpp).
 * Тестирует правила полей, не нативный рантайм.
 */
export interface SensorReadingMappingInput {
  x: number;
  y: number;
  z: number;
  timestampMs: number;
}

export interface SensorReading {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export function readingFromMappingInput(input: SensorReadingMappingInput): SensorReading {
  return {
    x: input.x,
    y: input.y,
    z: input.z,
    timestamp: input.timestampMs,
  };
}
