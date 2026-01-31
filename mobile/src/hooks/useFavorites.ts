import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@favorites';

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (raw) setIds(JSON.parse(raw));
    });
  }, []);

  const persist = useCallback((next: string[]) => {
    setIds(next);
    AsyncStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const toggle = useCallback(
    (id: string) => {
      const next = ids.includes(id)
        ? ids.filter((i) => i !== id)
        : [...ids, id];
      persist(next);
    },
    [ids, persist],
  );

  const isFavorite = useCallback((id: string) => ids.includes(id), [ids]);

  const clear = useCallback(() => {
    persist([]);
  }, [persist]);

  return { ids, toggle, isFavorite, clear };
}
