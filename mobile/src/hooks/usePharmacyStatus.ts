import { useState, useEffect, useCallback, useRef } from 'react';
import type { DutySlot } from '../types';
import {
  isOpenNow,
  getPharmacyStatus,
  getCurrentMinutes,
} from '../utils/dutySchedule';

import { useTranslation } from '../i18n/translations';

/**
 * Hook to get real-time pharmacy status that updates every minute
 *
 * @param duties - Array of duty slots for today
 * @returns Current status with auto-refresh
 */
export function usePharmacyStatus(duties: DutySlot[] | undefined) {
  const { t } = useTranslation();

  const [status, setStatus] = useState(() =>
    getPharmacyStatus(duties ?? [], t)
  );

  // Update status when duties change
  useEffect(() => {
    setStatus(getPharmacyStatus(duties ?? [], t));
  }, [duties, t]);

  // Auto-refresh every minute
  useEffect(() => {
    const updateStatus = () => {
      setStatus(getPharmacyStatus(duties ?? [], t));
    };

    // Calculate ms until next minute boundary for precise timing
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    // First update at the next minute boundary
    const initialTimeout = setTimeout(() => {
      updateStatus();

      // Then update every minute
      const interval = setInterval(updateStatus, 60 * 1000);

      // Cleanup interval when component unmounts
      return () => clearInterval(interval);
    }, msUntilNextMinute);

    return () => clearTimeout(initialTimeout);
  }, [duties, t]);

  return status;
}

/**
 * Hook for simple open/closed status without auto-refresh
 * Use when you don't need real-time updates (e.g., list items)
 */
export function useIsOpenNow(duties: DutySlot[] | undefined): boolean {
  return isOpenNow(duties ?? []);
}

/**
 * Hook that returns a function to check if pharmacy is open
 * Useful for callbacks or when you need to check multiple pharmacies
 */
export function useOpenChecker() {
  return useCallback((duties: DutySlot[] | undefined): boolean => {
    return isOpenNow(duties ?? []);
  }, []);
}

/**
 * Hook to track time and trigger re-renders at specific intervals
 * Useful for countdown timers or time-sensitive displays
 *
 * @param intervalMs - Update interval in milliseconds (default: 60000 = 1 minute)
 * @returns Current time in minutes since midnight
 */
export function useCurrentTime(intervalMs: number = 60000): number {
  const [currentMinutes, setCurrentMinutes] = useState(getCurrentMinutes);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMinutes(getCurrentMinutes());
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return currentMinutes;
}

/**
 * Hook for countdown to next status change (opening or closing)
 *
 * @param duties - Array of duty slots
 * @returns Minutes until next status change, or null if unknown
 */
export function useStatusCountdown(duties: DutySlot[] | undefined): {
  minutesUntil: number | null;
  event: 'opens' | 'closes' | null;
} {
  const status = usePharmacyStatus(duties);

  if (status.isOpen && status.currentSlot) {
    // Calculate time until closing
    const current = getCurrentMinutes();
    const end = parseInt(status.currentSlot.end.split(':')[0], 10) * 60 +
      parseInt(status.currentSlot.end.split(':')[1], 10);
    const start = parseInt(status.currentSlot.start.split(':')[0], 10) * 60 +
      parseInt(status.currentSlot.start.split(':')[1], 10);

    let minutesUntilClose: number;
    if (end < start) {
      // Cross-midnight
      if (current >= start) {
        minutesUntilClose = (24 * 60 - current) + end;
      } else {
        minutesUntilClose = end - current;
      }
    } else {
      minutesUntilClose = end - current;
    }

    return { minutesUntil: minutesUntilClose, event: 'closes' };
  }

  if (status.nextOpening) {
    return { minutesUntil: status.nextOpening.minutesUntil, event: 'opens' };
  }

  return { minutesUntil: null, event: null };
}
