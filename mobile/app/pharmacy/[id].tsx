import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '../../src/theme/ThemeProvider';
import { usePharmacyDetail } from '../../src/hooks/usePharmacies';
import { FavoriteButton } from '../../src/components/FavoriteButton';
import { LoadingState } from '../../src/components/LoadingState';
import { EmptyState } from '../../src/components/EmptyState';
import { callPhone, openDirections, sharePharmacy } from '../../src/utils/linking';
import { formatDate, shiftLabel } from '../../src/utils/format';

export default function PharmacyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const { data: pharmacy, isLoading } = usePharmacyDetail(id);

  const getBadgeColors = (shift: string) => {
    switch (shift) {
      case 'morning':
        return { bg: colors.dutyMorningLight, text: colors.dutyMorning };
      case 'night':
        return { bg: colors.dutyNightLight, text: colors.dutyNight };
      default:
        return { bg: colors.dutyAllDayLight, text: colors.dutyAllDay };
    }
  };

  if (isLoading) return <LoadingState />;
  if (!pharmacy) return <EmptyState title="Δεν βρέθηκε το φαρμακείο" />;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Map snippet */}
      {pharmacy.lat && pharmacy.lng ? (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: pharmacy.lat,
              longitude: pharmacy.lng,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            userInterfaceStyle={isDark ? 'dark' : 'light'}
          >
            <Marker
              coordinate={{ latitude: pharmacy.lat, longitude: pharmacy.lng }}
            />
          </MapView>
        </View>
      ) : null}

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.name, { color: colors.text }]}>{pharmacy.name}</Text>
          <FavoriteButton id={pharmacy.id} />
        </View>

        <View style={styles.locationInfo}>
          <Ionicons name="location-outline" size={16} color={colors.textTertiary} />
          <View style={styles.locationText}>
            <Text style={[styles.address, { color: colors.textSecondary }]}>
              {pharmacy.address}
            </Text>
            <Text style={[styles.region, { color: colors.textTertiary }]}>
              {pharmacy.city}, {pharmacy.region}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {pharmacy.phone ? (
            <ActionButton
              icon="call-outline"
              label="Κλήση"
              bgColor={colors.successLight}
              iconColor={colors.success}
              onPress={() => callPhone(pharmacy.phone!)}
            />
          ) : null}
          {pharmacy.lat && pharmacy.lng ? (
            <ActionButton
              icon="navigate-outline"
              label="Οδηγίες"
              bgColor={colors.primaryLight}
              iconColor={colors.primary}
              onPress={() => openDirections(pharmacy.lat!, pharmacy.lng!, pharmacy.name)}
            />
          ) : null}
          <ActionButton
            icon="share-outline"
            label="Κοινοποίηση"
            bgColor={colors.warningLight}
            iconColor={colors.warning}
            onPress={() => sharePharmacy(pharmacy)}
          />
        </View>

        {/* Duty history */}
        {pharmacy.duties?.length ? (
          <View style={[styles.dutySection, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>
              ΙΣΤΟΡΙΚΟ ΕΦΗΜΕΡΙΩΝ
            </Text>
            {pharmacy.duties.map((d, index) => (
              <View
                key={d.id}
                style={[
                  styles.dutyRow,
                  index < pharmacy.duties.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.dutyDate, { color: colors.text }]}>
                  {formatDate(d.dutyDate)}
                </Text>
                <View
                  style={[
                    styles.dutyBadge,
                    { backgroundColor: getBadgeColors(d.shift).bg },
                  ]}
                >
                  <Text
                    style={[
                      styles.dutyBadgeText,
                      { color: getBadgeColors(d.shift).text },
                    ]}
                  >
                    {shiftLabel(d.shift)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function ActionButton({
  icon,
  label,
  bgColor,
  iconColor,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  bgColor: string;
  iconColor: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: bgColor, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon} size={22} color={iconColor} />
      <Text style={[styles.actionLabel, { color: iconColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: 180,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  locationInfo: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  locationText: {
    flex: 1,
  },
  address: {
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  region: {
    fontSize: 14,
    marginTop: 4,
    letterSpacing: -0.1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 6,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  dutySection: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  dutyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  dutyDate: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  dutyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dutyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
