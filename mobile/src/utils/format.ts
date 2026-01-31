import { format, parseISO } from 'date-fns';

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd/MM/yyyy');
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

export function shiftLabel(shift: string): string {
  switch (shift) {
    case 'morning':
      return 'Morning';
    case 'night':
      return 'Night';
    case 'all_day':
      return 'All Day';
    default:
      return shift;
  }
}
