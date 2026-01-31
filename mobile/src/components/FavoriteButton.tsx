import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { useFavorites } from '../hooks/useFavorites';

export function FavoriteButton({ id }: { id: string }) {
  const { colors } = useTheme();
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(id);

  return (
    <Pressable onPress={() => toggle(id)} hitSlop={12}>
      <Ionicons
        name={fav ? 'heart' : 'heart-outline'}
        size={24}
        color={fav ? colors.error : colors.textTertiary}
      />
    </Pressable>
  );
}
