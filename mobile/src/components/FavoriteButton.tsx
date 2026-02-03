import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { useFavorites } from '../hooks/useFavorites';

export function FavoriteButton({ id }: { id: string }) {
  const { colors } = useTheme();
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(id);

  return (
    <Pressable
      onPress={() => toggle(id)}
      hitSlop={12}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: fav ? colors.errorLight : colors.surfaceSecondary,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons
        name={fav ? 'heart' : 'heart-outline'}
        size={20}
        color={fav ? colors.error : colors.textTertiary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
