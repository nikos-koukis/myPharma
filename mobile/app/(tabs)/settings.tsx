import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView, Animated, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PharmacyIcon } from '../../src/components/PharmacyIcon';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAppStore } from '../../src/store';
import { useFavorites } from '../../src/hooks/useFavorites';
import { useSearchHistory } from '../../src/hooks/useSearchHistory';

const APP_VERSION = '1.0.0';

export default function SettingsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const themePreference = useAppStore((s) => s.themePreference);
  const setThemePreference = useAppStore((s) => s.setThemePreference);
  const { ids: favIds, clear: clearFavorites } = useFavorites();
  const { history, clear: clearHistory } = useSearchHistory();

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
    { value: 'system' as const, label: 'Auto', icon: 'phone-portrait-outline' as const },
    { value: 'light' as const, label: 'Light', icon: 'sunny-outline' as const },
    { value: 'dark' as const, label: 'Dark', icon: 'moon-outline' as const },
  ];

  const handleThemeChange = (value: 'system' | 'light' | 'dark') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThemePreference(value);
  };

  const confirmClearFavorites = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Διαγραφή Αγαπημένων', `Διαγραφή ${favIds.length} αγαπημένων;`, [
      { text: 'Άκυρο', style: 'cancel' },
      { text: 'Διαγραφή', style: 'destructive', onPress: clearFavorites },
    ]);
  };

  const confirmClearHistory = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Διαγραφή Ιστορικού', `Διαγραφή ${history.length} αναζητήσεων;`, [
      { text: 'Άκυρο', style: 'cancel' },
      { text: 'Διαγραφή', style: 'destructive', onPress: clearHistory },
    ]);
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
          <Text style={[styles.appName, { color: colors.text }]}>myPharma</Text>
          <Text style={[styles.appTagline, { color: colors.textTertiary }]}>
            Βρες εφημερεύοντα φαρμακεία
          </Text>
          <View style={[styles.versionBadge, { backgroundColor: colors.surfaceSecondary }]}>
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>v{APP_VERSION}</Text>
          </View>
        </View>

        {/* Theme Selector */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>ΕΜΦΑΝΙΣΗ</Text>
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

        {/* Data Management */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>ΔΕΔΟΜΕΝΑ</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingsRow
            icon="heart"
            iconColor={colors.error}
            iconBg={colors.errorLight}
            label="Αγαπημένα"
            value={favIds.length.toString()}
            onPress={favIds.length > 0 ? confirmClearFavorites : undefined}
            disabled={!favIds.length}
            colors={colors}
            showChevron={favIds.length > 0}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            icon="time"
            iconColor={colors.warning}
            iconBg={colors.warningLight}
            label="Ιστορικό αναζήτησης"
            value={history.length.toString()}
            onPress={history.length > 0 ? confirmClearHistory : undefined}
            disabled={!history.length}
            colors={colors}
            showChevron={history.length > 0}
          />
        </View>

        {/* About */}
        <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>ΠΛΗΡΟΦΟΡΙΕΣ</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingsRow
            icon="star"
            iconColor="#FFB800"
            iconBg="#FFF8E6"
            label="Βαθμολόγησε την εφαρμογή"
            colors={colors}
            showChevron
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Add App Store link here
            }}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            icon="share-social"
            iconColor={colors.primary}
            iconBg={colors.primaryLight}
            label="Μοιράσου την εφαρμογή"
            colors={colors}
            showChevron
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              // Add share functionality
            }}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingsRow
            icon="mail"
            iconColor="#5856D6"
            iconBg="#EDEDFD"
            label="Επικοινωνία"
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
            © {new Date().getFullYear()} myPharma
          </Text>
        </View>
      </ScrollView>
    </View>
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
