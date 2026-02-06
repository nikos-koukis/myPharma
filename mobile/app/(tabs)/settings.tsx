import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, Animated, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PharmacyIcon } from '../../src/components/PharmacyIcon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAppStore } from '../../src/store';
import { useTranslation } from '../../src/i18n/translations';

const APP_VERSION = '1.1.0';

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, language } = useTranslation();
  const themePreference = useAppStore((s) => s.themePreference);
  const setThemePreference = useAppStore((s) => s.setThemePreference);
  const setLanguage = useAppStore((s) => s.setLanguage);

  // Gradient colors based on theme
  const gradientColors = (themePreference === 'dark' || (themePreference === 'system' && isDark))
    ? ['#0F172A', '#020617'] as [string, string]
    : ['#E0F2E9', '#F0FDF4', '#FFFFFF'] as [string, string, string];

  // Logic for theme is slightly different because it tracks preference, here relying on `isDark` from useTheme which is already resolved is safer honestly. 
  // Let's use `colors.background` for fallback but `isDark` is cleaner.
  const resolvedGradient = (colors.background === '#FFFFFF' || colors.background === '#F8FAFC')
    ? ['#E0F2E9', '#F0FDF4', '#FFFFFF'] as [string, string, string]
    : ['#0F172A', '#020617'] as [string, string];

  // Actually useTheme `isDark` is the source of truth for rendering
  const activeGradient = React.useMemo(() => { // use React.useMemo or just simple const
    return isDark
      ? ['#0F172A', '#020617'] as [string, string]
      : ['#E0F2E9', '#F0FDF4', '#FFFFFF'] as [string, string, string];
  }, [isDark]);


  const themeOptions = [
    { value: 'system' as const, label: t('all'), icon: 'phone-portrait-outline' as const },
    { value: 'light' as const, label: 'Light', icon: 'sunny-outline' as const },
    { value: 'dark' as const, label: 'Dark', icon: 'moon-outline' as const },
  ];

  const languageOptions = [
    { value: 'el' as const, label: 'Ελληνικά', flag: '🇬🇷' },
    { value: 'en' as const, label: 'English', flag: '🇺🇸' },
  ];

  const handleThemeChange = (value: 'system' | 'light' | 'dark') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThemePreference(value);
  };



  return (
    <View style={styles.container}>
      <LinearGradient
        colors={activeGradient}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* App Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={[styles.logoContainer, { backgroundColor: colors.primaryLight }]}>
            <PharmacyIcon size={40} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>PharmaGO</Text>
          <Text style={[styles.appTagline, { color: colors.textTertiary }]}>
            {t('tagline')}
          </Text>
          <View style={[styles.versionBadge, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>{t('version')}{APP_VERSION}</Text>
          </View>
        </View>

        {/* Language Selector */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{t('language')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.themeSelector, { backgroundColor: colors.surfaceSecondary }]}>
            {languageOptions.map((opt) => {
              const isSelected = language === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setLanguage(opt.value);
                  }}
                  style={[
                    styles.themeOption,
                    isSelected && [styles.themeOptionActive, { backgroundColor: colors.card }],
                  ]}
                >
                  <Text style={{ fontSize: 16 }}>{opt.flag}</Text>
                  <Text
                    style={[
                      styles.themeLabel,
                      { color: isSelected ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Theme Selector */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{t('appearance')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.themeSelector, { backgroundColor: colors.surfaceSecondary }]}>
            {themeOptions.map((opt) => {
              const isSelected = themePreference === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => handleThemeChange(opt.value)}
                  style={[
                    styles.themeOption,
                    isSelected && [styles.themeOptionActive, { backgroundColor: colors.card }],
                  ]}
                >
                  <Ionicons
                    name={opt.icon}
                    size={18}
                    color={isSelected ? colors.primary : colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.themeLabel,
                      { color: isSelected ? colors.primary : colors.textSecondary },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>



        {/* Emergency Numbers */}
        <Text style={[styles.sectionTitle, { color: colors.error }]}>{t('emergency_numbers')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.error + '20' }]}>
          <View style={styles.emergencyGrid}>
            <EmergencyButton number="166" label={t('ambulance')} color="#FF3B30" />
            <EmergencyButton number="100" label={t('police')} color="#007AFF" />
            <EmergencyButton number="199" label={t('fire_brigade')} color="#FF9500" />
            <EmergencyButton number="112" label="112" color="#5856D6" />
          </View>
          <Text style={[styles.emergencyNote, { color: colors.textTertiary }]}>
            {t('european_emergency')}
          </Text>
        </View>

        {/* About */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{t('information')}</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingsRow
            icon="star"
            iconColor="#FFB800"
            iconBg="#FFF8E6"
            label={t('rate_app')}
            colors={colors}
            showChevron
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            icon="share-social"
            iconColor={colors.primary}
            iconBg={colors.primaryLight}
            label={t('share_app')}
            colors={colors}
            showChevron
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            icon="chatbox-ellipses"
            iconColor="#10B981"
            iconBg="#D1FAE5"
            label={t('send_feedback')}
            colors={colors}
            showChevron
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/feedback');
            }}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            icon="mail"
            iconColor="#5856D6"
            iconBg="#EDEDFD"
            label={t('contact_us')}
            colors={colors}
            showChevron
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              Linking.openURL('mailto:support@mypharma.gr');
            }}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.copyright, { color: colors.textTertiary }]}>
            {t('copyright')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function EmergencyButton({ number, label, color }: { number: string; label: string; color: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={() => Linking.openURL(`tel:${number}`)}
      style={({ pressed }) => [
        styles.emergencyButton,
        { backgroundColor: color + '15', borderColor: color + '30', opacity: pressed ? 0.7 : 1 }
      ]}
    >
      <Ionicons name="call" size={18} color={color} />
      <View>
        <Text style={[styles.emergencyNumber, { color }]}>{number}</Text>
        <Text style={[styles.emergencyLabel, { color: colors.textSecondary }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

function SettingsRow({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  onPress,
  disabled,
  colors,
  showChevron,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  value?: string;
  onPress?: () => void;
  disabled?: boolean;
  colors: any;
  showChevron?: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!disabled && onPress) {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        speed: 50,
      }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || !onPress}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Animated.View style={[styles.row, { transform: [{ scale: scaleAnim }] }]}>
        <View style={[styles.iconContainer, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {value !== undefined && (
          <View style={[styles.badge, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{value}</Text>
          </View>
        )}
        {showChevron && (
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 8,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 14,
    marginTop: 4,
    letterSpacing: -0.2,
  },
  versionBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  themeSelector: {
    flexDirection: 'row',
    margin: 6,
    borderRadius: 12,
    padding: 4,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  themeOptionActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  themeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginLeft: 64,
  },
  emergencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 10,
  },
  emergencyButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  emergencyNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  emergencyLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  emergencyNote: {
    fontSize: 11,
    paddingHorizontal: 16,
    paddingBottom: 16,
    lineHeight: 16,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  copyright: {
    fontSize: 12,
    marginTop: 6,
  },
});
