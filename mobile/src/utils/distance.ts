/**
 * Calculate distance between two coordinates using Haversine formula
 *
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format distance for display in Greek
 *
 * @param meters - Distance in meters
 * @returns Formatted distance string (e.g., "500μ" or "1.2χλμ")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}μ`;
  }
  return `${(meters / 1000).toFixed(1)}χλμ`;
}

// Average walking speed: 5 km/h = 83.33 m/min
const WALKING_SPEED_M_PER_MIN = 83.33;

// Average driving speed in city: 30 km/h = 500 m/min
const DRIVING_SPEED_M_PER_MIN = 500;

/**
 * Calculate estimated walking time
 * @param meters Distance in meters
 * @returns Formatted string like "5 λεπτά" or "1 ώρα"
 */
export function calculateWalkingTime(meters: number): string {
  const minutes = Math.round(meters / WALKING_SPEED_M_PER_MIN);

  if (minutes < 1) {
    return '< 1 λεπτό';
  }
  if (minutes === 1) {
    return '1 λεπτό';
  }
  if (minutes < 60) {
    return `${minutes} λεπτά`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return hours === 1 ? '1 ώρα' : `${hours} ώρες`;
  }
  return hours === 1
    ? `1 ώρα ${remainingMinutes} λεπτά`
    : `${hours} ώρες ${remainingMinutes} λεπτά`;
}

/**
 * Calculate estimated driving time
 * @param meters Distance in meters
 * @returns Formatted string like "2 λεπτά"
 */
export function calculateDrivingTime(meters: number): string {
  const minutes = Math.round(meters / DRIVING_SPEED_M_PER_MIN);

  if (minutes < 1) {
    return '< 1 λεπτό';
  }
  if (minutes === 1) {
    return '1 λεπτό';
  }
  if (minutes < 60) {
    return `${minutes} λεπτά`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return hours === 1 ? '1 ώρα' : `${hours} ώρες`;
  }
  return hours === 1
    ? `1 ώρα ${remainingMinutes} λεπτά`
    : `${hours} ώρες ${remainingMinutes} λεπτά`;
}

