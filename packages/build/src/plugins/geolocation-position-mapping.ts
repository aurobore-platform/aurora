/**
 * Контракт маппинга QGeoPositionInfo → Position (паритет с GeolocationMapping.cpp).
 * Тестирует правила полей, не нативный рантайм.
 */
export interface PositionMappingInput {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestampMs: number;
}

export interface Position {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  timestamp: number;
}

export function positionFromMappingInput(input: PositionMappingInput): Position {
  const result: Position = {
    latitude: input.latitude,
    longitude: input.longitude,
    timestamp: input.timestampMs,
  };
  if (input.accuracy !== undefined) result.accuracy = input.accuracy;
  if (input.altitude !== undefined) result.altitude = input.altitude;
  if (input.altitudeAccuracy !== undefined) result.altitudeAccuracy = input.altitudeAccuracy;
  if (input.heading !== undefined) result.heading = input.heading;
  if (input.speed !== undefined) result.speed = input.speed;
  return result;
}
