export const lightColors = {
  // Backgrounds - clean white base
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceSecondary: '#F5F5F5',
  surfaceElevated: '#FFFFFF',

  // Text - refined hierarchy
  text: '#111827', // Deep slate/black
  textSecondary: '#374151', // Dark grey
  textTertiary: '#4B5563', // Medium grey (was too light)

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

  // Glassmorphism (light mode - minimal effect)
  glass: 'rgba(255, 255, 255, 0.8)',
  glassBorder: 'rgba(0, 0, 0, 0.06)',

  // Navigation
  tabBar: '#FFFFFF',
  tabBarBorder: 'transparent',
  icon: '#4B5563',
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
  markerGlow: 'rgba(168, 197, 190, 0.4)',
};

export const darkColors: typeof lightColors = {
  // Backgrounds - deep dark for glass contrast
  background: '#0A0F14',
  surface: '#111920',
  surfaceSecondary: '#1A232D',
  surfaceElevated: '#202A36',

  // Text - clear hierarchy
  text: '#E8EAF0',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',

  // Brand colors - SOFT MINT GREEN
  primary: '#BFDFD2',
  primaryDark: '#9FCFBE',
  primaryLight: 'rgba(191, 223, 210, 0.15)',
  primaryMuted: 'rgba(191, 223, 210, 0.25)',

  // Semantic colors
  accent: '#BFDFD2',
  accentLight: 'rgba(191, 223, 210, 0.15)',
  success: '#BFDFD2',
  successLight: 'rgba(191, 223, 210, 0.15)',
  error: '#FF4757',
  errorLight: 'rgba(255, 71, 87, 0.15)',
  warning: '#FFD93D',
  warningLight: 'rgba(255, 217, 61, 0.15)',

  // Open status badge
  open: '#BFDFD2',
  openLight: 'rgba(191, 223, 210, 0.15)',

  // Borders & dividers - subtle glass borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderSecondary: 'rgba(255, 255, 255, 0.12)',
  shadow: 'rgba(0, 0, 0, 0.6)',

  // Cards & surfaces - glass effect
  card: 'rgba(20, 30, 40, 0.8)',
  cardHover: 'rgba(30, 40, 55, 0.9)',

  // Glassmorphism
  glass: 'rgba(20, 30, 45, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',

  // Navigation
  tabBar: 'rgba(10, 15, 20, 0.95)',
  tabBarBorder: 'transparent',
  icon: '#6B7280',
  iconActive: '#BFDFD2',

  // Duty badges
  dutyMorning: '#FFD93D',
  dutyMorningLight: 'rgba(255, 217, 61, 0.15)',
  dutyNight: '#A78BFA',
  dutyNightLight: 'rgba(167, 139, 250, 0.15)',
  dutyAllDay: '#BFDFD2',
  dutyAllDayLight: 'rgba(191, 223, 210, 0.15)',

  // Map marker - soft glow
  marker: '#BFDFD2',
  markerBorder: '#9FCFBE',
  markerGlow: 'rgba(191, 223, 210, 0.5)',
};

export type Colors = typeof lightColors;
