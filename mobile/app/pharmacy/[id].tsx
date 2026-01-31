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

  if (isLoading) return <LoadingState />;
  if (!pharmacy) return <EmptyState title="Pharmacy not found" />;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Map snippet */}
      {pharmacy.lat && pharmacy.lng ? (
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
      ) : null}

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.name, { color: colors.text }]}>{pharmacy.name}</Text>
          <FavoriteButton id={pharmacy.id} />
        </View>

        <Text style={[styles.address, { color: colors.textSecondary }]}>
          {pharmacy.address}
        </Text>
        <Text style={[styles.region, { color: colors.textTertiary }]}>
          {pharmacy.city}, {pharmacy.region}
        </Text>

        {/* Actions */}
        <View style={styles.actions}>
          {pharmacy.phone ? (
            <ActionButton
              icon="call-outline"
              label="Call"
              color={colors.accent}
              onPress={() => callPhone(pharmacy.phone!)}
            />
          ) : null}
          {pharmacy.lat && pharmacy.lng ? (
            <ActionButton
              icon="navigate-outline"
              label="Directions"
              color={colors.primary}
              onPress={() => openDirections(pharmacy.lat!, pharmacy.lng!, pharmacy.name)}
            />
          ) : null}
          <ActionButton
            icon="share-outline"
            label="Share"
            color={colors.warning}
            onPress={() => sharePharmacy(pharmacy)}
          />
        </View>

        {/* Duty history */}
        {pharmacy.duties?.length ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              Duty History
            </Text>
            {pharmacy.duties.map((d) => (
              <View
                key={d.id}
                style={[styles.dutyRow, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.dutyDate, { color: colors.text }]}>
                  {formatDate(d.dutyDate)}
                </Text>
                <View
                  style={[
                    styles.dutyBadge,
                    {
                      backgroundColor:
                        d.shift === 'morning'
                          ? colors.dutyMorning
                          : d.shift === 'night'
                            ? colors.dutyNight
                            : colors.dutyAllDay,
                    },
                  ]}
                >
                  <Text style={styles.dutyBadgeText}>{shiftLabel(d.shift)}</Text>
                </View>
              </View>
            ))}
          </>
        ) : null}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function ActionButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.actionBtn, { backgroundColor: colors.surfaceSecondary }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: '100%', height: 180 },
  content: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 22, fontWeight: '700', flex: 1, marginRight: 12 },
  address: { fontSize: 15, marginTop: 6 },
  region: { fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
  },
  actionLabel: { fontSize: 12, fontWeight: '500' },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 28,
    marginBottom: 10,
  },
  dutyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dutyDate: { fontSize: 14 },
  dutyBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  dutyBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
});
