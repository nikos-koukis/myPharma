import type { DutySlot } from '../types';

/**
 * Convert "HH:MM" to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Get Greece timezone offset in minutes (handles DST)
 * Greece is UTC+2 (winter) or UTC+3 (summer/DST)
 */
function getGreeceOffset(): number {
  const now = new Date();
  // Greece DST: last Sunday of March to last Sunday of October
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  // Find last Sunday of March
  const marchLast = new Date(Date.UTC(year, 2, 31, 1, 0, 0)); // March 31, 01:00 UTC
  while (marchLast.getUTCDay() !== 0) marchLast.setUTCDate(marchLast.getUTCDate() - 1);

  // Find last Sunday of October
  const octLast = new Date(Date.UTC(year, 9, 31, 1, 0, 0)); // October 31, 01:00 UTC
  while (octLast.getUTCDay() !== 0) octLast.setUTCDate(octLast.getUTCDate() - 1);

  // Check if we're in DST period (UTC+3) or standard time (UTC+2)
  const isDST = now.getTime() >= marchLast.getTime() && now.getTime() < octLast.getTime();
  return isDST ? 3 * 60 : 2 * 60; // Return offset in minutes
}

/**
 * Get current time as minutes since midnight (Greece timezone)
 */
export function getCurrentMinutes(): number {
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const greeceMinutes = (utcMinutes + getGreeceOffset()) % (24 * 60);
  return greeceMinutes;
}

/**
 * Get current date in YYYY-MM-DD format (Greece timezone)
 */
export function getCurrentDate(): string {
  const now = new Date();
  const offsetMs = getGreeceOffset() * 60 * 1000;
  const greeceTime = new Date(now.getTime() + offsetMs + now.getTimezoneOffset() * 60 * 1000);

  const year = greeceTime.getFullYear();
  const month = String(greeceTime.getMonth() + 1).padStart(2, '0');
  const day = String(greeceTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a time slot is currently active, handling cross-midnight intervals
 *
 * @param slot - The duty slot with start/end times
 * @param currentMinutes - Current time in minutes (optional, defaults to now)
 * @returns true if the slot is currently active
 *
 * Examples:
 * - Normal: 08:00-14:00, current 10:00 → true
 * - Cross-midnight: 21:00-02:00, current 23:00 → true
 * - Cross-midnight: 21:00-02:00, current 01:00 → true
 * - Cross-midnight: 21:00-02:00, current 10:00 → false
 */
export function isSlotActive(slot: DutySlot, currentMinutes?: number): boolean {
  const current = currentMinutes ?? getCurrentMinutes();
  const start = timeToMinutes(slot.start);
  const end = timeToMinutes(slot.end);

  // Cross-midnight interval (e.g., 21:00 - 02:00)
  if (end < start) {
    // Open if current >= start (same day) OR current < end (next day morning)
    return current >= start || current < end;
  }

  // Normal interval (e.g., 08:00 - 14:00)
  return current >= start && current < end;
}

/**
 * Check if pharmacy is currently open based on its duty slots
 *
 * @param duties - Array of duty slots for today
 * @returns true if any slot is currently active
 */
export function isOpenNow(duties: DutySlot[]): boolean {
  if (!duties || duties.length === 0) return false;

  const currentMinutes = getCurrentMinutes();
  return duties.some((slot) => isSlotActive(slot, currentMinutes));
}

/**
 * Find the currently active slot (if any)
 */
export function getCurrentSlot(duties: DutySlot[]): DutySlot | null {
  if (!duties || duties.length === 0) return null;

  const currentMinutes = getCurrentMinutes();
  return duties.find((slot) => isSlotActive(slot, currentMinutes)) ?? null;
}

/**
 * Calculate minutes until a slot starts
 * Returns negative if slot has already started
 */
function minutesUntilStart(slot: DutySlot, currentMinutes: number): number {
  const start = timeToMinutes(slot.start);

  if (start > currentMinutes) {
    // Slot starts later today
    return start - currentMinutes;
  } else {
    // Slot starts tomorrow (add 24h)
    return (24 * 60) - currentMinutes + start;
  }
}

/**
 * Find the next opening time if pharmacy is currently closed
 *
 * @param duties - Array of duty slots
 * @returns Object with next opening info, or null if open now or no upcoming slots
 */
export function getNextOpening(duties: DutySlot[]): {
  slot: DutySlot;
  minutesUntil: number;
  opensAt: string;
  isTomorrow: boolean;
} | null {
  if (!duties || duties.length === 0) return null;

  const currentMinutes = getCurrentMinutes();

  // Check if already open
  if (isOpenNow(duties)) return null;

  // Find the next slot to start
  let nextSlot: DutySlot | null = null;
  let minMinutes = Infinity;

  for (const slot of duties) {
    const minutes = minutesUntilStart(slot, currentMinutes);
    if (minutes > 0 && minutes < minMinutes) {
      minMinutes = minutes;
      nextSlot = slot;
    }
  }

  if (!nextSlot) return null;

  const isTomorrow = timeToMinutes(nextSlot.start) <= currentMinutes;

  return {
    slot: nextSlot,
    minutesUntil: minMinutes,
    opensAt: nextSlot.start,
    isTomorrow,
  };
}

/**
 * Format remaining time in human-readable Greek
 */
export function formatTimeUntil(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} λεπτά`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (mins === 0) {
    return hours === 1 ? '1 ώρα' : `${hours} ώρες`;
  }

  const hourStr = hours === 1 ? '1 ώρα' : `${hours} ώρες`;
  return `${hourStr} και ${mins} λεπτά`;
}

/**
 * Get a status string for display
 */
export function getPharmacyStatus(duties: DutySlot[]): {
  isOpen: boolean;
  statusText: string;
  statusColor: 'success' | 'warning' | 'error';
  currentSlot: DutySlot | null;
  nextOpening: ReturnType<typeof getNextOpening>;
} {
  if (!duties || duties.length === 0) {
    return {
      isOpen: false,
      statusText: 'Δεν εφημερεύει σήμερα',
      statusColor: 'error',
      currentSlot: null,
      nextOpening: null,
    };
  }

  const currentSlot = getCurrentSlot(duties);

  if (currentSlot) {
    const end = timeToMinutes(currentSlot.end);
    const current = getCurrentMinutes();

    // Calculate time until closing
    let minutesUntilClose: number;
    if (end < timeToMinutes(currentSlot.start)) {
      // Cross-midnight: if we're before midnight, time until midnight + end
      // if we're after midnight, just time until end
      if (current >= timeToMinutes(currentSlot.start)) {
        minutesUntilClose = (24 * 60 - current) + end;
      } else {
        minutesUntilClose = end - current;
      }
    } else {
      minutesUntilClose = end - current;
    }

    // Dynamic status based on time until closing
    let statusColor: 'success' | 'warning' | 'error' = 'success';
    let statusText = `Ανοιχτό μέχρι ${currentSlot.end}`;

    if (minutesUntilClose <= 5) {
      statusColor = 'error';
      statusText = `Κλείνει σε ${minutesUntilClose}'`;
    } else if (minutesUntilClose <= 20) {
      statusColor = 'warning';
      statusText = `Ανοιχτό μέχρι ${currentSlot.end}`;
    }

    return {
      isOpen: true,
      statusText,
      statusColor,
      currentSlot,
      nextOpening: null,
    };
  }

  const nextOpening = getNextOpening(duties);

  if (nextOpening) {
    const prefix = nextOpening.isTomorrow ? 'Αύριο' : 'Σήμερα';
    return {
      isOpen: false,
      statusText: `${prefix} στις ${nextOpening.opensAt}`,
      statusColor: 'error',
      currentSlot: null,
      nextOpening,
    };
  }

  return {
    isOpen: false,
    statusText: 'Κλειστό',
    statusColor: 'error',
    currentSlot: null,
    nextOpening: null,
  };
}

/**
 * Format duty slots for display
 */
export function formatDutySlots(duties: DutySlot[]): string {
  if (!duties || duties.length === 0) return 'Όλη μέρα';

  return duties.map((slot) => {
    const end = timeToMinutes(slot.end);
    const start = timeToMinutes(slot.start);
    const crossesMidnight = end < start;

    return `${slot.start} - ${slot.end}${crossesMidnight ? ' (Επόμενης)' : ''}`;
  }).join('\n');
}
