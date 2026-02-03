export const lightColors = {
  // Backgrounds - clean white base
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F5F5F5',
  surfaceElevated: '#FFFFFF',

  // Text - refined hierarchy
  text: '#1A1D21',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',

  // Brand colors - sage/mint green (hsl 166, 18%, 73%)
  primary: '#A8C5BE',
  primaryDark: '#7BA399',
  primaryLight: '#E8F0ED',
  primaryMuted: '#D4E4DF',

  // Semantic colors
  accent: '#A8C5BE',
  accentLight: '#E8F0ED',
  success: '#22C55E',
  successLight: '#DCFCE7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',

  // Open status badge
  open: '#22C55E',
  openLight: '#DCFCE7',

  // Borders & dividers - subtle
  border: '#E5E5E5',
  borderSecondary: '#E2E8F0',
  shadow: 'rgba(0,0,0,0.03)',

  // Cards & surfaces
  card: '#FFFFFF',
  cardHover: '#FAFAFA',

  // Navigation
  tabBar: '#FFFFFF',
  tabBarBorder: 'transparent',
  icon: '#9CA3AF',
  iconActive: '#7BA399',

  // Duty badges
  dutyMorning: '#F59E0B',
  dutyMorningLight: '#FEF3C7',
  dutyNight: '#8B5CF6',
  dutyNightLight: '#EDE9FE',
  dutyAllDay: '#22C55E',
  dutyAllDayLight: '#DCFCE7',

  // Map marker
  marker: '#A8C5BE',
  markerBorder: '#7BA399',
};

export const darkColors: typeof lightColors = {
  // Backgrounds - deep blue-tinted dark (from CSS oklch values)
  background: '#161A22',
  surface: '#1E2430',
  surfaceSecondary: '#252D3A',
  surfaceElevated: '#2A3444',

  // Text - clear hierarchy
  text: '#E8EAF0',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',

  // Brand colors - sage/mint (same hue, works well on dark)
  primary: '#A8C5BE',
  primaryDark: '#8FB3AA',
  primaryLight: '#2A3D38',
  primaryMuted: '#354945',

  // Semantic colors
  accent: '#A8C5BE',
  accentLight: '#2A3D38',
  success: '#4ADE80',
  successLight: '#14532D',
  error: '#F87171',
  errorLight: '#450A0A',
  warning: '#FBBF24',
  warningLight: '#451A03',

  // Open status badge
  open: '#4ADE80',
  openLight: '#14532D',

  // Borders & dividers
  border: '#2E3744',
  borderSecondary: '#3A4454',
  shadow: 'rgba(0,0,0,0.4)',

  // Cards & surfaces
  card: '#1E2430',
  cardHover: '#252D3A',

  // Navigation
  tabBar: '#161A22',
  tabBarBorder: 'transparent',
  icon: '#6B7280',
  iconActive: '#A8C5BE',

  // Duty badges
  dutyMorning: '#FBBF24',
  dutyMorningLight: '#451A03',
  dutyNight: '#A78BFA',
  dutyNightLight: '#2E1065',
  dutyAllDay: '#4ADE80',
  dutyAllDayLight: '#14532D',

  // Map marker
  marker: '#A8C5BE',
  markerBorder: '#8FB3AA',
};

export type Colors = typeof lightColors;
